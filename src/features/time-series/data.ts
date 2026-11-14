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
  truncated: boolean
}

const baseURL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
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

  if (!baseURL) throw new Error('Chưa cấu hình VITE_API_BASE_URL.')

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
  const filtered = items.filter(x => { const t = Date.parse(x.observed_at); return Number.isFinite(t) && t >= start && t <= end })
  if (filtered.length === 0) throw new Error("Backend chưa có dữ liệu chuỗi thời gian trong khoảng ngày đã chọn.")
  return {
    items: filtered,
    truncated,
  }
}
