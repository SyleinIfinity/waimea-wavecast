export type DailyQuality = {
  date_hst: string
  sample_count: number
  valid_wave_count: number
  coverage_ratio: number | null
}

export type QualityIssue = {
  severity: 'info' | 'warning' | 'error'
  status: 'open' | 'resolved' | 'ignored'
  count: number
}

export type QualityOverview = {
  daily: DailyQuality[]
  issues: QualityIssue[]
}

export type QualityRange = { from: string; to: string }

export function hstToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Honolulu', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}

export function validateRange(range: QualityRange): string | null {
  if (!validDate(range.from) || !validDate(range.to)) return 'Vui lòng nhập đầy đủ ngày hợp lệ.'
  if (range.from > range.to) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'
  if ((Date.parse(range.to) - Date.parse(range.from)) / 86400000 > 366) {
    return 'Vui lòng chọn tối đa 366 ngày chênh lệch cho mỗi lần tải.'
  }
  return null
}

export function calendarDates(range: QualityRange): string[] {
  const error = validateRange(range)
  if (error) throw new Error(error)
  const dates: string[] = []
  for (let t = Date.parse(`${range.from}T00:00:00Z`); t <= Date.parse(`${range.to}T00:00:00Z`); t += 86400000) {
    dates.push(new Date(t).toISOString().slice(0, 10))
  }
  return dates
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('API chất lượng dữ liệu trả về cấu trúc không hợp lệ.')
  return value as Record<string, unknown>
}

function count(value: unknown): number {
  // PostgreSQL numeric/count may be serialized as strings; null is never zero.
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') throw new Error('API trả về số mẫu không hợp lệ.')
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('API trả về số mẫu không hợp lệ.')
  return n
}

export function parseOverview(value: unknown, range: QualityRange): QualityOverview {
  const root = record(value)
  if (root.status !== 'ok' && root.status !== 'empty') throw new Error('API chưa trả về trạng thái Data Quality được hỗ trợ.')
  const body = record(root.data)
  if (!Array.isArray(body.daily) || !Array.isArray(body.issues)) {
    throw new Error('API cần trả về data.daily và data.issues theo hợp đồng Data Quality overview.')
  }
  const seen = new Set<string>()
  const daily = body.daily.map((raw): DailyQuality => {
    const row = record(raw)
    const date = String(row.date_hst ?? '')
    if (!validDate(date) || date < range.from || date > range.to || seen.has(date)) {
      throw new Error('API trả về ngày HST sai phạm vi hoặc bị trùng.')
    }
    seen.add(date)
    const samples = count(row.sample_count)
    const valid = count(row.valid_wave_count)
    if (valid > samples) throw new Error('Số mẫu WVHT hợp lệ vượt tổng số mẫu.')
    const rawCoverage = row.coverage_ratio
    let coverage: number | null = null
    if (rawCoverage !== null && rawCoverage !== undefined) {
      if ((typeof rawCoverage !== 'number' && typeof rawCoverage !== 'string') || rawCoverage === '') {
        throw new Error('API trả về coverage không hợp lệ.')
      }
      coverage = Number(rawCoverage)
      if (!Number.isFinite(coverage) || coverage < 0 || coverage > 1) throw new Error('Coverage phải nằm trong khoảng 0–1 hoặc null.')
    }
    return { date_hst: date, sample_count: samples, valid_wave_count: valid, coverage_ratio: coverage }
  }).sort((a, b) => a.date_hst.localeCompare(b.date_hst))
  const issues = body.issues.map((raw): QualityIssue => {
    const row = record(raw)
    if (!['info', 'warning', 'error'].includes(String(row.severity)) || !['open', 'resolved', 'ignored'].includes(String(row.status))) {
      throw new Error('API trả về severity/status QC chưa được hỗ trợ.')
    }
    return { severity: row.severity as QualityIssue['severity'], status: row.status as QualityIssue['status'], count: count(row.count) }
  })
  return { daily, issues }
}

export function summarize(data: QualityOverview) {
  const samples = data.daily.reduce((sum, day) => sum + day.sample_count, 0)
  const valid = data.daily.reduce((sum, day) => sum + day.valid_wave_count, 0)
  const measured = data.daily.filter(day => day.coverage_ratio !== null)
  return {
    samples, valid,
    validRatio: samples > 0 ? valid / samples : null,
    meanCoverage: measured.length ? measured.reduce((sum, day) => sum + day.coverage_ratio!, 0) / measured.length : null,
    coverageDays: measured.length,
    daysWithSamples: data.daily.filter(day => day.sample_count > 0).length,
    openIssues: data.issues.filter(issue => issue.status === 'open').reduce((sum, issue) => sum + issue.count, 0),
  }
}

export function monthlyQuality(daily: DailyQuality[], range: QualityRange) {
  const months = [...new Set(calendarDates(range).map(date => date.slice(0, 7)))]
  return months.map(month => {
    const days = daily.filter(day => day.date_hst.startsWith(month))
    const stats = summarize({ daily: days, issues: [] })
    return { month, days: days.length, ...stats }
  })
}

export function csvCell(value: unknown): string {
  if (typeof value === 'number') return String(value)
  const raw = value == null ? '' : String(value)
  const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}
