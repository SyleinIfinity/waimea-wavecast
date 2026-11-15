export type Metric = 'WVHT' | 'DPD' | 'APD' | 'MWD' | 'WTMP'
export type SummaryRow = {
  period_start: string
  sample_count: number
  mean_value: number
  median_value: number
}
export type TimeSeriesOverview = {
  status: 'ok' | 'empty'
  metric: Metric
  timezone: 'UTC'
  qc_only: boolean
  summary: Record<'day' | 'week' | 'month', SummaryRow[]>
  totals: {
    observation_count: number
    metric_count: number
    mean_value: number | null
    median_value: number | null
    day_count: number
  }
  histogram: { bin: number; sample_count: number }[]
  scatter: {
    total_pairs: number
    points: { wave_height_m: number; dominant_period_s: number }[]
  }
}

const rawBase = String(import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .replace(/\/+$/, '')
const baseURL = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`

export async function loadTimeSeries(startDate: string, endDate: string, metric: Metric,
  qcOnly: boolean, signal?: AbortSignal): Promise<TimeSeriesOverview> {
  const start = Date.parse(`${startDate}T00:00:00.000Z`)
  const end = Date.parse(`${endDate}T23:59:59.999Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) throw new Error('Khoảng thời gian UTC không hợp lệ')
  if (!baseURL) throw new Error('Chưa cấu hình VITE_API_BASE_URL.')
  const query = new URLSearchParams({
    start: new Date(start).toISOString(), end: new Date(end).toISOString(),
    metric, qc_only: String(qcOnly),
  })
  const response = await fetch(`${baseURL}/analytics/time-series/overview?${query}`, {
    signal, headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`)
  const body = await response.json() as TimeSeriesOverview
  if (!body || !['ok', 'empty'].includes(body.status) || body.metric !== metric || body.timezone !== 'UTC' ||
    body.qc_only !== qcOnly || !body.summary || !Array.isArray(body.summary.day) ||
    !Array.isArray(body.summary.week) || !Array.isArray(body.summary.month) ||
    !body.totals || !Array.isArray(body.histogram) || !body.scatter || !Array.isArray(body.scatter.points)) {
    throw new Error('Backend trả về dữ liệu chuỗi thời gian không hợp lệ')
  }
  if (body.status === 'empty') throw new Error('Backend chưa có quan trắc trong khoảng ngày đã chọn.')
  return body
}
