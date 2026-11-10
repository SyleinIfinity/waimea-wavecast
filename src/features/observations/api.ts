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

const USE_MOCK =
  !import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_USE_MOCK === 'true'

const DEMO_COUNT = 55
const TWO_HOURS = 2 * 60 * 60 * 1000

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, {
      once: true,
    })
  })
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

function createDemoObservations(): Observation[] {
  const now = Date.now()
  const anchor = Math.floor(now / 3600000) * 3600000

  return Array.from({ length: DEMO_COUNT }, (_, i) => {
    const timestamp = anchor - i * TWO_HOURS

    const waveHeight = Math.max(
      0.4,
      2.2 +
        0.85 * Math.sin(i * 0.31) +
        0.35 * Math.cos(i * 0.13)
    )

    const dominantPeriod =
      10.5 +
      2.4 * Math.sin(i * 0.19) +
      0.65 * Math.cos(i * 0.4)

    const averagePeriod = dominantPeriod - 2.1

    const direction =
      (305 + Math.sin(i * 0.22) * 48 + i * 2.5) % 360

    const temperature =
      25.4 + Math.sin(i * 0.14) * 1.1

    const quality =
      i % 17 === 0
        ? 'suspect'
        : i % 11 === 0
          ? 'partial'
          : 'valid'

    return {
      station_id: '51201',
      observed_at: new Date(timestamp).toISOString(),
      wave_height_m: i % 19 === 0 ? null : round(waveHeight),
      dominant_period_s: i % 13 === 0 ? null : round(dominantPeriod, 1),
      average_period_s: i % 15 === 0 ? null : round(averagePeriod, 1),
      wave_direction_deg: Math.round(direction),
      sea_temperature_c: round(temperature, 1),
      source: 'TL02 DEMO DATA',
      quality_flag: quality,
      revision_no: i % 9 === 0 ? 2 : 1,
    }
  })
}

const demoObservations = createDemoObservations()

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
    wave_height_m: nullableNumber(row.wave_height_m),
    dominant_period_s: nullableNumber(row.dominant_period_s),
    average_period_s: nullableNumber(row.average_period_s),
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
    revision_no: nullableNumber(row.revision_no),
  }
}

export async function getObservations(
  filters: ObservationFilters,
  signal?: AbortSignal
): Promise<ObservationPage> {
  if (USE_MOCK) {
    await delay(300, signal)

    const from = Date.parse(filters.start)
    const to = Date.parse(filters.end)

    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from > to
    ) {
      throw new Error('Khoảng thời gian lọc không hợp lệ')
    }

    const filtered = demoObservations.filter((row) => {
      const time = Date.parse(row.observed_at)
      return time >= from && time <= to
    })

    const limit = Math.max(
      1,
      Math.min(filters.limit ?? 20, 100)
    )

    let offset = 0

    if (filters.cursor) {
      const match = /^mock:(\d+)$/.exec(filters.cursor)

      if (!match) {
        throw new Error('Cursor mock không hợp lệ')
      }

      offset = Number(match[1])
    }

    const items = filtered.slice(offset, offset + limit)
    const nextOffset = offset + limit

    return {
      items,
      nextCursor:
        nextOffset < filtered.length
          ? `mock:${nextOffset}`
          : null,
      isMock: true,
    }
  }

  if (!BASE_URL) {
    throw new Error(
      'Chưa cấu hình VITE_API_BASE_URL.'
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
      ? (body.pagination as Record<string, unknown>)
      : {}

  const dataObject =
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data)
      ? (data as Record<string, unknown>)
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