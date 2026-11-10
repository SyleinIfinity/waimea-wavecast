export type WaveObservation = {
  observed_at: string
  wave_height_m: number | null
  dominant_period_s: number | null
  average_period_s: number | null
  wave_direction_deg: number | null
  sea_temperature_c: number | null
  quality_flag: string
}

export type TimeSeriesResult = {
  items: WaveObservation[]
  isMock: boolean
  truncated: boolean
}

const baseURL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const useMock = !baseURL || import.meta.env.VITE_USE_MOCK === 'true'
const round = (n: number, places = 2) => Number(n.toFixed(places))

// Dữ liệu giả lập dùng riêng cho giao diện S03; KHÔNG phải quan trắc NOAA.
// 240 ngày, 4 lần/ngày để kiểm thử biểu đồ Monthly qua nhiều tháng.
// Chỉ dùng cho Mock Mode, không phải dữ liệu NOAA.
const DEMO = (() => {
  const midnight = new Date()
  midnight.setUTCHours(0, 0, 0, 0)
  const start = midnight.getTime() - 239 * 86400000
  return Array.from({ length: 240 * 4 }, (_, i): WaveObservation => {
    const day = Math.floor(i / 4)
    const time = start + i * 6 * 3600000
    const height = 1.85 + 0.62 * Math.sin(day * 0.18) + 0.34 * Math.sin(i * 0.55) + 0.22 * Math.cos(day * 0.053)
    const period = 9.1 + height * 0.85 + 1.15 * Math.sin(i * 0.21)
    return {
      observed_at: new Date(time).toISOString(),
      wave_height_m: i % 47 === 0 ? null : round(Math.max(0.25, height)),
      dominant_period_s: i % 29 === 0 ? null : round(period, 1),
      average_period_s: i % 31 === 0 ? null : round(period - 1.9, 1),
      wave_direction_deg: i % 53 === 0 ? null : Math.round((325 + 27 * Math.sin(i * 0.11) + 360) % 360),
      sea_temperature_c: i % 41 === 0 ? null : round(25.1 + 0.9 * Math.cos(day * 0.065), 1),
      quality_flag: i % 43 === 0 ? 'suspect' : i % 23 === 0 ? 'partial' : 'valid',
    }
  })
})()

const num = (x: unknown): number | null => {
  if (x === null || x === undefined || x === '') return null
  const v = Number(x)
  return Number.isFinite(v) ? v : null
}
function normalize(raw: unknown): WaveObservation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Observation không hợp lệ')
  const x = raw as Record<string, unknown>
  return {
    observed_at: String(x.observed_at ?? ''),
    wave_height_m: num(x.wave_height_m),
    dominant_period_s: num(x.dominant_period_s),
    average_period_s: num(x.average_period_s),
    wave_direction_deg: num(x.mean_wave_direction_deg ?? x.wave_direction_deg),
    sea_temperature_c: num(x.sea_surface_temp_c ?? x.sea_temperature_c),
    quality_flag: String(x.quality_status ?? x.quality_flag ?? 'unverified'),
  }
}

export async function loadTimeSeries(startDate: string, endDate: string, signal?: AbortSignal): Promise<TimeSeriesResult> {
  const start = Date.parse(`${startDate}T00:00:00.000Z`)
  const end = Date.parse(`${endDate}T23:59:59.999Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) throw new Error('Khoảng thời gian UTC không hợp lệ')

  if (useMock) {
    return { items: DEMO.filter(x => { const t = Date.parse(x.observed_at); return t >= start && t <= end }), isMock: true, truncated: false }
  }

  // Adapter tạm qua endpoint observations: giới hạn 10 trang để không tải vô hạn.
  // Khi TL04/TL05 cung cấp metrics/summary API, thay riêng adapter này.
  const items: WaveObservation[] = []
  let cursor: string | null = null
  let truncated = false
  const seen = new Set<string>()
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ station_id: '51201', start: new Date(start).toISOString(), end: new Date(end).toISOString(), limit: '200' })
    if (cursor) query.set('cursor', cursor)
    const response = await fetch(`${baseURL}/observations?${query}`, { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`)
    const body: unknown = await response.json()
    const root = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data) ? root.data as Record<string, unknown> : {}
    const rows = Array.isArray(body) ? body : Array.isArray(root.items) ? root.items : Array.isArray(root.data) ? root.data : Array.isArray(data.items) ? data.items : null
    if (!rows) throw new Error('Backend trả về dữ liệu không đúng cấu trúc danh sách')
    items.push(...rows.map(normalize))
    const paging = root.pagination && typeof root.pagination === 'object' ? root.pagination as Record<string, unknown> : {}
    const next = root.next_cursor ?? paging.next_cursor ?? data.next_cursor
    if (typeof next !== 'string' || !next) break
    if (seen.has(next)) throw new Error('Backend trả về cursor lặp')
    seen.add(next)
    cursor = next
    if (page === 9) truncated = true
  }
  return {
    items: items.filter(x => { const t = Date.parse(x.observed_at); return Number.isFinite(t) && t >= start && t <= end }),
    isMock: false, truncated,
  }
}
