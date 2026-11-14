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
  note: string
}

export type TrendFilters = { metric: string; from: string; to: string }

const rawBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const base = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`
function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function loadTrend(filters: TrendFilters, signal?: AbortSignal): Promise<TrendResult> {
  if (filters.from > filters.to) throw new Error('Tháng bắt đầu phải nhỏ hơn hoặc bằng tháng kết thúc.')
  if (!rawBase) throw new Error('Chưa cấu hình VITE_API_BASE_URL.')
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
  const rows = Array.isArray(root.data) ? root.data : Array.isArray(data.items) ? data.items : Array.isArray(data.components) ? data.components : null
  if (!rows || rows.length === 0) throw new Error('Backend chưa có dữ liệu phân rã mùa vụ trong khoảng đã chọn.')
  const items = rows.map((v: unknown): TrendPoint => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Thành phần phân rã không hợp lệ')
    const p = v as Record<string, unknown>
    const period = String(p.period_start_hst ?? p.period ?? p.month ?? p.date ?? '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('Thiếu nhãn tháng trong response')
    return { period, observed: numberOrNull(p.observed_value ?? p.observed), trend: numberOrNull(p.trend_value ?? p.trend), seasonal: numberOrNull(p.seasonal_value ?? p.seasonal), residual: numberOrNull(p.residual_value ?? p.residual) }
  }).sort((a, b) => a.period.localeCompare(b.period))
  return {
    items,
    method: String((rows[0] as Record<string, unknown>).decomposition_method ?? data.method ?? root.method ?? 'Chưa có'),
    seasonalPeriod: Number((rows[0] as Record<string, unknown>).seasonal_periods ?? data.seasonal_period ?? root.seasonal_period ?? 12),
    note: 'Kết quả phân rã lấy từ Backend.',
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
