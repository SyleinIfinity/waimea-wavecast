
export type Observation = {
  station_id: string
  observed_at: string
  wave_height_m: number | null
  dominant_period_s: number | null
  average_period_s: number | null
  wave_direction_deg: number | null
  sea_temperature_c: number | null
  source: string
  quality_flag: string
  revision_no: number | null
}

export type ObservationPage = {
  items: Observation[]
  nextCursor: string | null
  isMock: boolean
}

export type ObservationFilters = {
  start: string
  end: string
  cursor?: string
  limit?: number
}

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '')

function nullableNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue)
    ? numberValue
    : null
}

function normalizeObservation(value: unknown): Observation {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('Bản ghi quan trắc không hợp lệ')
  }

  const row = value as Record<string, unknown>

  return {
    station_id: String(row.station_id ?? '51201'),

    observed_at: String(row.observed_at ?? ''),

    wave_height_m: nullableNumber(
      row.wave_height_m
    ),

    dominant_period_s: nullableNumber(
      row.dominant_period_s
    ),

    average_period_s: nullableNumber(
      row.average_period_s
    ),

    wave_direction_deg: nullableNumber(
      row.mean_wave_direction_deg ??
      row.wave_direction_deg
    ),

    sea_temperature_c: nullableNumber(
      row.sea_surface_temp_c ??
      row.sea_temperature_c
    ),

    source: String(
      row.source_kind ??
      row.source ??
      'N/A'
    ),

    quality_flag: String(
      row.quality_status ??
      row.quality_flag ??
      'unverified'
    ),

    revision_no: nullableNumber(
      row.revision_no
    ),
  }
}

export async function getObservations(
  filters: ObservationFilters,
  signal?: AbortSignal
): Promise<ObservationPage> {

  // Không có Backend thì không tạo dữ liệu giả.
  if (!BASE_URL) {
    throw new Error(
      'Chưa cấu hình VITE_API_BASE_URL. ' +
      'Vui lòng kết nối Backend khi API Observations sẵn sàng.'
    )
  }

  const params = new URLSearchParams({
    station_id: '51201',
    start: filters.start,
    end: filters.end,
    limit: String(filters.limit ?? 20),
  })

  if (filters.cursor) {
    params.set('cursor', filters.cursor)
  }

  const response = await fetch(
  `${BASE_URL}/observations?${params.toString()}`,
  {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  }
)

  if (!response.ok) {
    throw new Error(
      `Không thể tải dữ liệu quan trắc. HTTP ${response.status}`
    )
  }

  const result: unknown = await response.json()

  if (
    typeof result !== 'object' ||
    result === null
  ) {
    throw new Error(
      'Định dạng phản hồi Backend không hợp lệ'
    )
  }

  const body = result as Record<string, unknown>
  const data = body.data

  let rows: unknown[] | null = null

  if (Array.isArray(result)) {
    rows = result
  } else if (Array.isArray(body.items)) {
    rows = body.items
  } else if (Array.isArray(data)) {
    rows = data
  } else if (
    data !== null &&
    typeof data === 'object' &&
    Array.isArray(
      (data as Record<string, unknown>).items
    )
  ) {
    rows = (data as { items: unknown[] }).items
  }

  if (rows === null) {
    throw new Error(
      'Backend chưa trả về danh sách observations đúng định dạng'
    )
  }

  const pagination =
    body.pagination !== null &&
    typeof body.pagination === 'object'
      ? body.pagination as Record<string, unknown>
      : {}

  const dataObject =
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data)
      ? data as Record<string, unknown>
      : {}

  const nextCursor =
    body.next_cursor ??
    pagination.next_cursor ??
    dataObject.next_cursor ??
    null

  return {
    items: rows.map(normalizeObservation),

    nextCursor:
      typeof nextCursor === 'string' && nextCursor.length > 0
        ? nextCursor
        : null,

    isMock: false,
  }
}
