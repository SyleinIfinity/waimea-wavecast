import { useEffect, useMemo, useState } from 'react'

import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Filter,
  RefreshCw,
  Waves,
} from 'lucide-react'

import EChart from '../../components/charts/EChart'

import {
  getObservations,
  type Observation,
} from './api'

type Metric = 'WVHT' | 'DPD' | 'APD' | 'MWD' | 'WTMP'

const PAGE_SIZE = 20

const metrics: Record<
  Metric,
  {
    label: string
    field: keyof Observation
    unit: string
  }
> = {
  WVHT: {
    label: 'Wave Height',
    field: 'wave_height_m',
    unit: 'm',
  },
  DPD: {
    label: 'Dominant Period',
    field: 'dominant_period_s',
    unit: 's',
  },
  APD: {
    label: 'Average Period',
    field: 'average_period_s',
    unit: 's',
  },
  MWD: {
    label: 'Wave Direction',
    field: 'wave_direction_deg',
    unit: '°',
  },
  WTMP: {
    label: 'Sea Temperature',
    field: 'sea_temperature_c',
    unit: '°C',
  },
}

function formatNumber(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return value.toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  })
}

function formatTime(
  value: string,
  timeZone: string
): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function initialDates() {
  const end = new Date()
  const start = new Date(
    end.getTime() - 7 * 24 * 60 * 60 * 1000
  )

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default function ObservationsPage() {
  const defaults = useMemo(initialDates, [])

  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [metric, setMetric] = useState<Metric>('WVHT')
  const [validOnly, setValidOnly] = useState(false)

  const [applied, setApplied] = useState({
    start: defaults.start,
    end: defaults.end,
  })

  const [page, setPage] = useState(1)
  const [cursor, setCursor] = useState('')
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const [records, setRecords] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const result = await getObservations(
          {
            start: `${applied.start}T00:00:00.000Z`,
            end: `${applied.end}T23:59:59.999Z`,
            cursor,
            limit: PAGE_SIZE,
          },
          controller.signal
        )

        if (controller.signal.aborted) {
          return
        }

        setRecords(result.items)
        setNextCursor(result.nextCursor)
        setIsMock(result.isMock)
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return
        }

        setRecords([])
        setNextCursor(null)
        setIsMock(false)

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu quan trắc.'
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => controller.abort()
  }, [applied, cursor, reload])

  const visibleRecords = useMemo(() => {
    const indexed = records.map((record, index) => ({
      record,
      originalIndex: index,
    }))

    if (!validOnly) {
      return indexed
    }

    return indexed.filter(
      ({ record }) =>
        record.quality_flag.toLowerCase() === 'valid'
    )
  }, [records, validOnly])

  const selected = metrics[metric]

  const chartData = useMemo(() => {
    return [...visibleRecords]
      .map(({ record }) => record)
      .filter((record) => {
        const value = record[selected.field]

        return (
          typeof value === 'number' &&
          Number.isFinite(value) &&
          Number.isFinite(Date.parse(record.observed_at))
        )
      })
      .sort(
        (a, b) =>
          Date.parse(a.observed_at) -
          Date.parse(b.observed_at)
      )
  }, [visibleRecords, selected])

  const chartOptions = useMemo(
    () => ({
      backgroundColor: 'transparent',
      animationDuration: 350,
      grid: {
        left: 65,
        right: 30,
        top: 30,
        bottom: 75,
      },
      tooltip: {
        trigger: 'axis' as const,
      },
      xAxis: {
        type: 'category' as const,
        data: chartData.map(
          (record) => record.observed_at
        ),
        axisLabel: {
          color: '#94b5c9',
          hideOverlap: true,
          formatter: (value: string) =>
            formatTime(value, 'Pacific/Honolulu'),
        },
        axisLine: {
          lineStyle: {
            color: '#31556b',
          },
        },
      },
      yAxis: {
        type: 'value' as const,
        name: selected.unit,
        nameTextStyle: {
          color: '#94b5c9',
        },
        axisLabel: {
          color: '#94b5c9',
        },
        splitLine: {
          lineStyle: {
            color: '#203b50',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside' as const,
        },
        {
          type: 'slider' as const,
          bottom: 10,
        },
      ],
      series: [
        {
          name: `${metric} (${selected.unit})`,
          type: 'line' as const,
          smooth: metric !== 'MWD',
          connectNulls: false,
          showSymbol: chartData.length < 30,
          itemStyle: {
            color: '#22d3ee',
          },
          lineStyle: {
            width: 3,
          },
          areaStyle:
            metric === 'MWD'
              ? undefined
              : { opacity: 0.08 },
          data: chartData.map(
            (record) => record[selected.field] as number
          ),
        },
      ],
    }),
    [chartData, metric, selected]
  )

  function applyFilters() {
    if (!start || !end || start > end) {
      setError(
        'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.'
      )
      return
    }

    setPage(1)
    setCursor('')
    setCursorHistory([])
    setApplied({ start, end })
    setReload((value) => value + 1)
  }

  function resetFilters() {
    setStart(defaults.start)
    setEnd(defaults.end)
    setMetric('WVHT')
    setValidOnly(false)
    setPage(1)
    setCursor('')
    setCursorHistory([])
    setApplied({ ...defaults })
    setReload((value) => value + 1)
  }

  function refreshData() {
    setReload((value) => value + 1)
  }

  function goToNextPage() {
    if (!nextCursor || loading) {
      return
    }

    setCursorHistory((history) => [
      ...history,
      cursor,
    ])

    setCursor(nextCursor)
    setPage((current) => current + 1)
  }

  function goToPreviousPage() {
    if (page <= 1 || loading) {
      return
    }

    const previousCursor =
      cursorHistory[cursorHistory.length - 1] ?? ''

    setCursorHistory((history) =>
      history.slice(0, -1)
    )

    setCursor(previousCursor)
    setPage((current) => current - 1)
  }

  function exportCSV() {
    if (visibleRecords.length === 0) {
      return
    }

    const headers = [
      'STT',
      'Observed UTC',
      'WVHT (m)',
      'DPD (s)',
      'APD (s)',
      'MWD (deg)',
      'WTMP (C)',
      'Source',
      'Quality',
      'Revision',
    ]

    function csvCell(value: unknown): string {
      const raw = String(value ?? '')
      const safe = /^[=+\-@\t\r]/.test(raw)
        ? `'${raw}`
        : raw

      return `"${safe.replace(/"/g, '""')}"`
    }

    const lines = visibleRecords.map(
      ({ record, originalIndex }) => {
        const stt =
          (page - 1) * PAGE_SIZE +
          originalIndex +
          1

        const values = [
          stt,
          record.observed_at,
          record.wave_height_m,
          record.dominant_period_s,
          record.average_period_s,
          record.wave_direction_deg,
          record.sea_temperature_c,
          record.source,
          record.quality_flag,
          record.revision_no,
        ]

        return values.map(csvCell).join(',')
      }
    )

    const content = [
      headers.join(','),
      ...lines,
    ].join('\r\n')

    const blob = new Blob(
      ['\uFEFF', content],
      {
        type: 'text/csv;charset=utf-8;',
      }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `waimea-observations-page-${page}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const inputClass =
    'w-full rounded-xl border border-[#31556b] ' +
    'bg-[#091f30] px-3 py-2.5 text-sm text-white ' +
    'outline-none focus:border-cyan-400'

  const secondaryButton =
    'rounded-xl border border-[#31556b] ' +
    'px-4 py-2.5 text-sm text-slate-200 ' +
    'hover:bg-[#193b51] ' +
    'disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <div className="w-full min-w-0 space-y-6 text-slate-100">
      <section className="rounded-2xl border border-[#28516a] bg-[#102d43] p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400">
          <Waves size={17} />
          S02 · NOAA Station 51201
        </div>

        <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
          Ocean Observations Explorer
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Khám phá dữ liệu quan trắc sóng biển,
          phân tích biến động theo thời gian và
          theo dõi chất lượng dữ liệu.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
            NOAA 51201 · Waimea Bay
          </span>

          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              loading
                ? 'bg-slate-500/10 text-slate-300'
                : isMock
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {loading
              ? 'LOADING...'
              : isMock
                ? 'MOCK DATA MODE'
                : 'BACKEND MODE'}
          </span>

          <span className="rounded-lg bg-[#17384d] px-3 py-1.5 text-xs text-slate-300">
            UTC Filters · HST Display
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-[#28516a] bg-[#10283c] p-5">
        <div className="mb-5 flex items-center gap-2">
          <Filter size={18} className="text-cyan-400" />
          <h2 className="font-bold text-white">
            Bộ lọc dữ liệu quan trắc
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <CalendarDays size={14} />
              Từ ngày (UTC)
            </span>

            <input
              type="date"
              value={start}
              onChange={(event) =>
                setStart(event.target.value)
              }
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-slate-400">
              Đến ngày (UTC)
            </span>

            <input
              type="date"
              value={end}
              onChange={(event) =>
                setEnd(event.target.value)
              }
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs text-slate-400">
              Chỉ số quan trắc
            </span>

            <select
              value={metric}
              onChange={(event) =>
                setMetric(
                  event.target.value as Metric
                )
              }
              className={inputClass}
            >
              {Object.entries(metrics).map(
                ([key, value]) => (
                  <option key={key} value={key}>
                    {key} · {value.label}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#062235] hover:bg-cyan-400"
          >
            Áp dụng
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className={secondaryButton}
          >
            Đặt lại
          </button>

          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className={`flex items-center gap-2 ${secondaryButton}`}
          >
            <RefreshCw size={15} />
            Làm mới
          </button>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={validOnly}
              onChange={(event) =>
                setValidOnly(event.target.checked)
              }
              className="accent-cyan-400"
            />
            Chỉ bản ghi QC valid
          </label>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Khi đang ở Mock Mode, dữ liệu hiển thị chỉ phục vụ demo giao diện và kiểm thử chức năng.
        </p>
      </section>

      {error && (
        <section
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-5"
        >
          <h3 className="font-semibold text-red-300">
            Không thể tải dữ liệu quan trắc
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-200/80">
            {error}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-[#28516a] bg-[#10283c] p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity
                size={18}
                className="text-cyan-400"
              />
              <h2 className="text-lg font-bold text-white">
                Time-Series Visualization
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {metric} · {selected.label} · {selected.unit} · Giờ Hawaii (HST)
            </p>
          </div>

          <span className="rounded-lg bg-[#15384d] px-3 py-2 text-xs text-cyan-300">
            <Database
              size={14}
              className="mr-1 inline"
            />
            {visibleRecords.length} bản ghi
          </span>
        </div>

        {loading ? (
          <div className="h-72 animate-pulse rounded-xl bg-[#193b50]" />
        ) : chartData.length >= 2 ? (
          <>
            {metric === 'MWD' && (
              <p className="mb-3 text-xs text-amber-300">
                MWD là dữ liệu góc 0°–360°. Cần xử lý đặc biệt khi phân tích hướng sóng qua ranh giới 0°/360°.
              </p>
            )}

            <EChart
              options={chartOptions}
              height={340}
            />
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#31556b] bg-[#091f30] px-5 text-center">
            <Waves
              size={30}
              className="mb-3 text-cyan-400"
            />

            <p className="font-semibold text-slate-200">
              Chưa có đủ dữ liệu để hiển thị biểu đồ
            </p>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Biểu đồ yêu cầu ít nhất hai bản ghi quan trắc có giá trị hợp lệ.
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Biểu đồ sử dụng dữ liệu của trang hiện tại, không đại diện cho toàn bộ lịch sử quan trắc.
        </p>
      </section>

      <section className="rounded-2xl border border-[#28516a] bg-[#10283c] p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              Observation Records
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Danh sách quan trắc · Trang {page} · {visibleRecords.length} bản ghi hiển thị
            </p>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            disabled={
              loading ||
              visibleRecords.length === 0
            }
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-[#062235] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={16} />
            Tải CSV trang này
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#28516a]">
          <table className="w-full min-w-[1150px] border-collapse text-left text-xs">
            <thead className="bg-[#091e30] uppercase text-slate-400">
              <tr>
                {[
                  'STT',
                  'UTC',
                  'HST',
                  'WVHT',
                  'DPD',
                  'APD',
                  'MWD',
                  'WTMP',
                  'Source',
                  'QC',
                  'Revision',
                ].map((heading, index) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-4 font-bold ${
                      index === 0
                        ? 'sticky left-0 z-20 w-16 min-w-16 border-r border-[#28516a] bg-[#091e30] text-center text-cyan-300'
                        : ''
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <RefreshCw
                      size={20}
                      className="mx-auto mb-3 animate-spin text-cyan-400"
                    />
                    Đang tải dữ liệu quan trắc...
                  </td>
                </tr>
              )}

              {!loading &&
                visibleRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      <Database
                        size={28}
                        className="mx-auto mb-3 text-cyan-400/60"
                      />
                      {error
                        ? 'Chưa thể tải bản ghi.'
                        : 'Không có bản ghi phù hợp với bộ lọc.'}
                    </td>
                  </tr>
                )}

              {!loading &&
                visibleRecords.map(
                  ({ record, originalIndex }) => {
                    const stt =
                      (page - 1) * PAGE_SIZE +
                      originalIndex +
                      1

                    return (
                      <tr
                        key={`${record.observed_at}-${originalIndex}`}
                        className="group border-t border-[#24455d] odd:bg-[#10283c] even:bg-[#0c2235] hover:bg-[#16364b]"
                      >
                        <td className="sticky left-0 z-10 border-r border-[#28516a] bg-[#10283c] px-4 py-3 text-center font-bold tabular-nums text-cyan-300 group-even:bg-[#0c2235] group-hover:bg-[#16364b]">
                          {stt}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">
                          {formatTime(
                            record.observed_at,
                            'UTC'
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                          {formatTime(
                            record.observed_at,
                            'Pacific/Honolulu'
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold tabular-nums text-white">
                          {formatNumber(
                            record.wave_height_m
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold tabular-nums text-white">
                          {formatNumber(
                            record.dominant_period_s
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold tabular-nums text-white">
                          {formatNumber(
                            record.average_period_s
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold tabular-nums text-white">
                          {formatNumber(
                            record.wave_direction_deg
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold tabular-nums text-white">
                          {formatNumber(
                            record.sea_temperature_c
                          )}
                        </td>

                        <td
                          className="max-w-44 truncate px-4 py-3 text-slate-300"
                          title={record.source}
                        >
                          {record.source}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-1 font-semibold ${
                              record.quality_flag.toLowerCase() === 'valid'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : record.quality_flag.toLowerCase() === 'suspect'
                                  ? 'bg-red-500/10 text-red-300'
                                  : 'bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {record.quality_flag}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center tabular-nums text-slate-300">
                          {formatNumber(
                            record.revision_no
                          )}
                        </td>
                      </tr>
                    )
                  }
                )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-300">
              Trang {page}
            </p>

            <p className="text-xs text-slate-500">
              Tối đa {PAGE_SIZE} bản ghi mỗi trang
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={loading || page === 1}
              className={`flex items-center gap-1.5 ${secondaryButton}`}
            >
              <ChevronLeft size={16} />
              Trước
            </button>

            <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 text-sm font-bold text-cyan-300">
              {page}
            </span>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={loading || !nextCursor}
              className={`flex items-center gap-1.5 ${secondaryButton}`}
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          STT được đánh theo vị trí bản ghi trên từng trang dữ liệu đã tải.
          Khi bật bộ lọc QC valid, một số số thứ tự có thể không liền nhau vì việc lọc đang diễn ra ở phía Frontend.
        </p>
      </section>
    </div>
  )
}