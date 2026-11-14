import { parseOverview, validateRange, type QualityOverview, type QualityRange } from './quality'

const rawBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const base = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`

// Production always uses the real API, even when a mock flag was left enabled.
export const qualityMockMode = import.meta.env.DEV && (!rawBase || import.meta.env.VITE_USE_MOCK === 'true')

export type QualityResult = { overview: QualityOverview; isMock: boolean; loadedAt: string }

export async function loadQualityOverview(range: QualityRange, signal?: AbortSignal): Promise<QualityResult> {
  const error = validateRange(range)
  if (error) throw new Error(error)
  signal?.throwIfAborted()
  if (qualityMockMode) {
    const { createQualityMock } = await import('./quality.mock')
    signal?.throwIfAborted()
    return { overview: createQualityMock(range), isMock: true, loadedAt: new Date().toISOString() }
  }
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
  return { overview: parseOverview(await response.json(), range), isMock: false, loadedAt: new Date().toISOString() }
}
