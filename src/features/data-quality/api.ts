import { parseOverview, validateRange, type QualityOverview, type QualityRange } from './quality'

const rawBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const base = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`

export type QualityResult = { overview: QualityOverview; loadedAt: string }

export async function loadQualityOverview(range: QualityRange, signal?: AbortSignal): Promise<QualityResult> {
  const error = validateRange(range)
  if (error) throw new Error(error)
  if (!rawBase) throw new Error('Chưa cấu hình VITE_API_BASE_URL.')
  const query = new URLSearchParams({ start_hst: range.from, end_hst: range.to })
  const response = await fetch(`${base}/data-quality/overview?${query}`, {
    signal, headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const message = response.status === 404 ? 'Backend chưa cung cấp Data Quality overview.'
      : response.status === 422 ? 'Backend không chấp nhận phạm vi ngày này.'
      : response.status === 503 ? 'Dịch vụ chất lượng dữ liệu hiện chưa sẵn sàng.'
      : `Không thể tải chất lượng dữ liệu. HTTP ${response.status}.`
    throw new Error(message)
  }
  const overview = parseOverview(await response.json(), range)
  if (!overview.daily.length && !overview.issues.length) throw new Error("Backend chưa có dữ liệu chất lượng trong khoảng ngày đã chọn.")
  return { overview, loadedAt: new Date().toISOString() }
}
