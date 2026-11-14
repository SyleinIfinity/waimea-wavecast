import { calendarDates, type QualityOverview, type QualityRange } from './quality.ts'

// Synthetic fixture ONLY. No NOAA measurements or scientific quality thresholds.
export function createQualityMock(range: QualityRange): QualityOverview {
  const dates = calendarDates(range)
  const daily = dates.flatMap((date, i) => {
    // Historical unavailability and gaps are illustrative, not source assertions.
    if (Number(date.slice(0, 4)) < 2007 || i % 37 === 9 || i % 37 === 10) return []
    const sample_count = i % 53 === 17 ? 0 : 28 + ((i * 7) % 21)
    return [{
      date_hst: date,
      sample_count,
      valid_wave_count: Math.max(0, sample_count - (i % 9)),
      // Assumed 48 slots applies to this fixture only.
      coverage_ratio: i % 19 === 5 ? null : sample_count / 48,
    }]
  })
  if (!daily.length) return { daily: [], issues: [] }
  const count = daily.reduce((sum, row) => sum + row.sample_count - row.valid_wave_count, 0)
  return {
    daily,
    issues: [
      { severity: 'warning', status: 'open', count: Math.ceil(count * 0.4) },
      { severity: 'error', status: 'open', count: Math.ceil(count * 0.1) },
      { severity: 'info', status: 'resolved', count: Math.floor(count * 0.3) },
      { severity: 'warning', status: 'resolved', count: Math.floor(count * 0.2) },
      { severity: 'info', status: 'ignored', count: 2 },
    ],
  }
}
