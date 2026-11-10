
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Clock3,
  Compass,
  Database,
  Droplets,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Waves,
  Wifi,
} from 'lucide-react'

import { loadLatest } from '../../api/client'
import type { LatestObservation } from '../../api/types'

const isMockMode =
  !import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_USE_MOCK === 'true'

function formatValue(
  value: number | null | undefined,
  unit: string,
) {
  if (value === null || value === undefined) {
    return '—'
  }

  return `${value.toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  })} ${unit}`
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có dữ liệu'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Pacific/Honolulu',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

type MetricCardProps = {
  title: string
  value: string
  description: string
  icon: ReactNode
  color?: string
  loading: boolean
}

function MetricCard({
  title,
  value,
  description,
  icon,
  color = 'text-cyan-400',
  loading,
}: MetricCardProps) {
  return (
    <div className="group rounded-2xl border border-[#24455D] bg-[#102A3F] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-950/30">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-slate-400">
          {title}
        </span>

        <div className={`rounded-xl bg-[#17394F] p-2.5 ${color}`}>
          {icon}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 h-10 w-32 animate-pulse rounded-lg bg-slate-700/60" />
      ) : (
        <div className="mt-5 text-3xl font-bold tracking-tight text-white">
          {value}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] =
    useState<LatestObservation | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    loadLatest(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setData(response.data)
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setData(null)
          setError(String(err))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [refreshKey])

  const refresh = () => {
    setRefreshKey((value) => value + 1)
  }

  return (
    <main className="w-full min-w-0 px-5 py-7 text-slate-100 sm:px-7 lg:px-9">

      {/* PAGE HEADER */}
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-cyan-400">
            <Waves size={16} />
            WAIMEA WAVECAST / OVERVIEW
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ocean Intelligence
            <span className="text-cyan-400"> Dashboard</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Theo dõi điều kiện sóng biển, chất lượng dữ liệu
            và các thông tin quan trắc tại NOAA Station 51201.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? 'animate-spin' : ''}
          />
          Làm mới dữ liệu
        </button>
      </div>

      {/* DATA SOURCE */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#254E63] bg-[#102D43] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
            <Wifi size={20} />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Station 51201 · Waimea Bay, Hawaii
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {isMockMode
                ? 'Demo Mode · Dữ liệu mô phỏng'
                : 'API Mode · Kết nối Backend'}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
            isMockMode
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
          }`}
        >
          {isMockMode ? 'MOCK DATA' : 'API MODE'}
        </span>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5"
        >
          <p className="font-semibold text-red-300">
            Không thể tải dữ liệu quan trắc
          </p>

          <p className="mt-2 break-words text-sm text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={refresh}
            className="mt-4 text-sm font-semibold text-red-200 underline underline-offset-4"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* METRICS HEADER */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">
            Live Ocean Metrics
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Các chỉ số từ bản ghi quan trắc mới nhất
          </p>
        </div>

        <Activity size={20} className="text-cyan-400" />
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          title="Wave Height"
          value={formatValue(data?.wave_height_m, 'm')}
          description="Significant Wave Height · WVHT"
          icon={<Waves size={21} />}
          loading={loading}
        />

        <MetricCard
          title="Dominant Period"
          value={formatValue(data?.dominant_period_s, 's')}
          description="Dominant Wave Period · DPD"
          icon={<Activity size={21} />}
          color="text-violet-400"
          loading={loading}
        />

        <MetricCard
          title="Wave Direction"
          value={formatValue(data?.wave_direction_deg, '°')}
          description="Mean Wave Direction · MWD"
          icon={<Compass size={21} />}
          color="text-amber-400"
          loading={loading}
        />

        <MetricCard
          title="Sea Temperature"
          value={formatValue(data?.sea_temperature_c, '°C')}
          description="Water Temperature · WTMP"
          icon={<Droplets size={21} />}
          color="text-emerald-400"
          loading={loading}
        />
      </div>

      {/* INFORMATION PANELS */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* OBSERVATION FEED */}
        <section className="rounded-2xl border border-[#24455D] bg-[#102A3F] p-6 xl:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400">
              <Database size={20} />
            </div>

            <div>
              <h2 className="font-bold text-white">
                Observation Feed
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Latest station observation
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-700/60" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-slate-700/60" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-700/60" />
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-[#183B50] px-3 py-2 text-sm text-cyan-300">
                  {data.source}
                </span>

                <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                  QC: {data.quality_flag}
                </span>
              </div>

              <div className="grid gap-4 border-t border-[#24455D] pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">
                    Station ID
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {data.station_id}
                  </p>
                </div>

                <div>
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock3 size={14} />
                    Observed At · HST
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {formatDate(data.observed_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#31556B] bg-[#0B2335] px-5 py-10 text-center">
              <Database
                size={28}
                className="mx-auto mb-3 text-slate-500"
              />

              <p className="text-sm text-slate-400">
                Chưa có dữ liệu quan trắc để hiển thị.
              </p>
            </div>
          )}
        </section>

        {/* STATION INFORMATION */}
        <section className="rounded-2xl border border-[#24455D] bg-[#102A3F] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400">
              <MapPin size={20} />
            </div>

            <h2 className="font-bold text-white">
              Station Information
            </h2>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">
                Station
              </span>

              <strong className="text-sm text-white">
                NOAA 51201
              </strong>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">
                Location
              </span>

              <strong className="text-sm text-white">
                Hawaii, USA
              </strong>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">
                Timezone
              </span>

              <strong className="text-sm text-white">
                Pacific/Honolulu
              </strong>
            </div>

            <div className="border-t border-[#24455D] pt-5">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck size={17} />

                <span className="text-sm font-semibold">
                  Quality Monitoring
                </span>
              </div>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                Trạng thái chất lượng được lấy từ
                cờ QC của bản ghi quan trắc.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="mt-7 border-t border-[#24455D] pt-5 text-xs text-slate-500">
        Waimea WaveCast · Frontend Core TL02 · NOAA Station 51201
      </div>
    </main>
  )
}
