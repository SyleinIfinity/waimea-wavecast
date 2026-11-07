import type { LatestResponse } from './types'

const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'
export async function loadLatest(signal?: AbortSignal): Promise<LatestResponse> {
  const response = await fetch(`${base}/observations/latest`, { signal })
  if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}`)
  return response.json() as Promise<LatestResponse>
}
