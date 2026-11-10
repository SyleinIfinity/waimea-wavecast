export type TrendPoint = {
  period: string
  observed: number | null
  trend: number | null
  seasonal: number | null
  residual: number | null
}

export type TrendResult = {
  items: TrendPoint[]
  method: string
  seasonalPeriod: number
  isMock: boolean
  note: string
}

export type TrendFilters = { metric: string; from: string; to: string }

const rawBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const base = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`
const useMock = !rawBase || import.meta.env.VITE_USE_MOCK === 'true'
const round = (n: number) => Number(n.toFixed(3))

// S04 demo độc lập, không phải dữ liệu NOAA hay kết quả mô hình Backend.
// Cố ý tạo 48 tháng ĐẦY ĐỦ (không dùng tháng hiện tại chưa hoàn tất).
function mockMonthly(metric: string): { period: string; value: number | null }[] {
  const current = new Date()
  const thisMonth = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)
  const values: { period: string; value: number | null }[] = []
  for (let i = 48; i >= 1; i--) {
    const date = new Date(thisMonth)
    date.setUTCMonth(date.getUTCMonth() - i)
    const index = 48 - i
    const seasonal = Math.cos(2 * Math.PI * date.getUTCMonth() / 12)
    const seasonal2 = Math.sin(2 * Math.PI * date.getUTCMonth() / 12)
    const phase = Math.sin(index * 1.7) * 0.07 + Math.cos(index * 0.67) * 0.055
    let value: number
    if (metric === 'DPD') value = 10.2 + index * 0.024 + 1.15 * seasonal + 0.5 * seasonal2 + phase * 4
    else if (metric === 'WTMP') value = 25.1 + index * 0.008 - 0.75 * seasonal + 0.35 * seasonal2 + phase
    else value = 1.85 + index * 0.007 + 0.53 * seasonal + 0.25 * seasonal2 + phase
    values.push({ period: date.toISOString().slice(0, 7), value: round(value) })
  }
  return values
}

// Centered 12-month moving average, seasonal indices theo tháng.
// Yêu cầu tối thiểu 36 tháng liên tục để mỗi tháng có >=2 lần quan sát
// ở vùng loại bỏ biên sau khi ước lượng xu hướng.
function decompose(raw: { period: string; value: number | null }[]): TrendPoint[] {
  if (raw.length < 36) {
    throw new Error('insufficient_data: Cần ít nhất 36 tháng liên tiếp để ước lượng 12-month moving average và mùa vụ có lặp lại.')
  }
  for (let i = 1; i < raw.length; i++) {
    const prior = new Date(`${raw[i - 1].period}-01T00:00:00Z`)
    prior.setUTCMonth(prior.getUTCMonth() + 1)
    if (prior.toISOString().slice(0, 7) !== raw[i].period) {
      throw new Error('insufficient_data: Chuỗi có tháng bị thiếu; không thể phân rã mà không nội suy.')
    }
  }
  if (raw.some(x => x.value === null)) {
    throw new Error('insufficient_data: Có tháng thiếu quan trắc; không nội suy dữ liệu để tạo seasonal giả.')
  }
  const y = raw.map(x => x.value as number)
  const trend: (number | null)[] = Array(y.length).fill(null)
  for (let i = 6; i + 6 < y.length; i++) {
    let sum = (y[i - 6] + y[i + 6]) / 2
    for (let j = i - 5; j <= i + 5; j++) sum += y[j]
    trend[i] = sum / 12
  }
  const byMonth: number[][] = Array.from({ length: 12 }, () => [])
  raw.forEach((x, i) => {
    if (trend[i] !== null) byMonth[Number(x.period.slice(5, 7)) - 1].push(y[i] - (trend[i] as number))
  })
  if (byMonth.some(group => group.length < 2)) {
    throw new Error('insufficient_data: Cần >=2 mẫu đã khử xu hướng cho từng tháng trong năm.')
  }
  const indices = byMonth.map(group => group.reduce((a, b) => a + b, 0) / group.length)
  const shift = indices.reduce((a, b) => a + b, 0) / 12
  return raw.map((item, i) => {
    const s = indices[Number(item.period.slice(5, 7)) - 1] - shift
    return {
      period: item.period,
      observed: round(y[i]),
      trend: trend[i] === null ? null : round(trend[i] as number),
      seasonal: trend[i] === null ? null : round(s),
      residual: trend[i] === null ? null : round(y[i] - (trend[i] as number) - s),
    }
  })
}

function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function loadTrend(filters: TrendFilters, signal?: AbortSignal): Promise<TrendResult> {
  if (filters.from > filters.to) throw new Error('Tháng bắt đầu phải nhỏ hơn hoặc bằng tháng kết thúc.')
  if (useMock) {
    const selected = mockMonthly(filters.metric).filter(x => x.period >= filters.from && x.period <= filters.to)
    return {
      items: decompose(selected),
      method: 'Additive · Centered 12-month moving average',
      seasonalPeriod: 12,
      isMock: true,
      note: 'Dữ liệu hoàn toàn mô phỏng, không phải quan trắc NOAA hoặc phân tích từ Backend.',
    }
  }
  // Contract dự kiến: GET /analytics/trend-seasonal?metric=WVHT&period=month&start_hst=...&end_hst=...
  // Không tự chạy thuật toán phân rã trên dữ liệu Backend, chỉ hiển thị kết quả Backend trả về.
  const params = new URLSearchParams({
    metric: filters.metric,
    period: 'month',
    start_hst: `${filters.from}-01`,
    end_hst: `${filters.to}-01`,
  })
  const response = await fetch(`${base}/analytics/trend-seasonal?${params}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Backend trend-seasonal trả về HTTP ${response.status}`)
  const json: unknown = await response.json()
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Phản hồi Backend không hợp lệ')
  const root = json as Record<string, unknown>
  if (root.status === 'insufficient_data') throw new Error(String(root.reason ?? 'insufficient_data: Chưa đủ dữ liệu mùa vụ.'))
  const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data) ? root.data as Record<string, unknown> : root
  const rows = Array.isArray(data.items) ? data.items : Array.isArray(data.components) ? data.components : null
  if (!rows) throw new Error('API chưa trả về items/components theo contract S04; cần đối chiếu DTO với Backend.')
  const items = rows.map((v: unknown): TrendPoint => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Thành phần phân rã không hợp lệ')
    const p = v as Record<string, unknown>
    const period = String(p.period ?? p.month ?? p.date ?? '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('Thiếu nhãn tháng trong response')
    return { period, observed: numberOrNull(p.observed), trend: numberOrNull(p.trend), seasonal: numberOrNull(p.seasonal), residual: numberOrNull(p.residual) }
  }).sort((a, b) => a.period.localeCompare(b.period))
  return {
    items,
    method: String(data.method ?? root.method ?? 'Backend-defined method'),
    seasonalPeriod: Number(data.seasonal_period ?? root.seasonal_period ?? 12),
    isMock: false,
    note: 'Kết quả decomposition lấy từ Backend; metadata cần xác nhận với nhóm API.',
  }
}

export function defaultTrendMonths(): { from: string; to: string } {
  const current = new Date()
  const beginning = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1))
  const last = new Date(beginning)
  last.setUTCMonth(last.getUTCMonth() - 1)
  const from = new Date(beginning)
  from.setUTCMonth(from.getUTCMonth() - 36)
  return { from: from.toISOString().slice(0, 7), to: last.toISOString().slice(0, 7) }
}
