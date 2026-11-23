import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Compass,
  Filter,
  Layers,
  RefreshCw,
  TrendingUp,
  Waves,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import EChart from '../../components/charts/EChart'
import WaveClassificationPanel from '../classification/WaveClassificationPanel'
import { ClusterScatterPanel } from '../clustering/ClusterScatterChart'
import { hstToday } from '../data-quality/quality'
import { getShadowForecasts } from '../../api/client'
import type { ForecastHorizon, IssuedForecast } from '../../api/types'

const HORIZONS: ForecastHorizon[] = ['30min', '1d', '7d', '30d']

const HORIZON_TITLES: Record<ForecastHorizon, { title: string; subtitle: string; desc: string }> = {
  '30min': {
    title: 'Ngắn hạn (30 phút)',
    subtitle: 'Dự báo tức thời điểm đo tiếp theo',
    desc: 'Ước lượng độ cao sóng WVHT tại mốc chu kỳ phát hành kế tiếp của NOAA.',
  },
  '1d': {
    title: 'Kỳ hạn 1 ngày',
    subtitle: 'Trung vị ngày mai (Hawaii)',
    desc: 'Dự báo trung vị độ cao sóng của cả ngày mai theo giờ Hawaii.',
  },
  '7d': {
    title: 'Kỳ hạn ngày thứ 7',
    subtitle: 'Trung vị ngày thứ 7 trong tương lai',
    desc: 'Dự báo độ cao sóng trung vị tại mốc ngày thứ 7 (không phải chuỗi từng ngày).',
  },
  '30d': {
    title: 'Trung bình 30 ngày',
    subtitle: 'Trung bình cả giai đoạn 30 ngày tới',
    desc: 'Dự báo giá trị trung bình độ cao sóng tổng thể trong 30 ngày tiếp theo.',
  },
}

function formatVN(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' (VN)'
}

function ThreeZoneTime({ iso }: { iso: string }) {
  const date = new Date(iso)
  const zones = [
    { label: 'VN', timeZone: 'Asia/Ho_Chi_Minh' },
    { label: 'UTC', timeZone: 'UTC' },
    { label: 'Hawaii', timeZone: 'Pacific/Honolulu' },
  ]

  return (
    <div className="mt-2 space-y-1.5 font-mono text-[11px] tabular-nums">
      {zones.map(({ label, timeZone }) => (
        <div key={label} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-2">
          <span className="text-slate-500">{label}</span>
          <span className="font-semibold text-slate-100">
            {Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', {
              timeZone,
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour12: false,
            }).format(date)}
          </span>
        </div>
      ))}
    </div>
  )
}

function metres(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${value.toFixed(2)} m`
}

function DualTimeClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const vnTime = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(time)

  const hstTime = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Pacific/Honolulu',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(time)

  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
      <div className="flex items-center gap-1.5 text-cyan-300">
        <Clock size={14} className="text-cyan-400 shrink-0" />
        <span className="text-slate-400 text-[11px]">Giờ Việt Nam (VN · UTC+7):</span>
        <strong className="text-white">{vnTime}</strong>
      </div>
      <span className="text-slate-700 hidden sm:inline">|</span>
      <div className="flex items-center gap-1.5 text-amber-300">
        <Clock size={14} className="text-amber-400 shrink-0" />
        <span className="text-slate-400 text-[11px]">Giờ Hawaii (HST · UTC-10):</span>
        <strong className="text-white">{hstTime}</strong>
      </div>
    </div>
  )
}

function HorizonCard({
  horizon,
  forecast,
  loading,
  error,
}: {
  horizon: ForecastHorizon
  forecast?: IssuedForecast
  loading: boolean
  error: string | null
}) {
  const meta = HORIZON_TITLES[horizon]

  // Trạng thái đối chiếu
  const isEvaluated = forecast?.actual_value != null && forecast?.evaluated_at
  const stateLabel = error ? 'Không tải được dữ liệu'
    : loading && !forecast ? 'Đang tải'
      : !forecast ? 'Chưa có dự báo'
        : isEvaluated ? 'Đã có kết quả' : 'Đang chờ dữ liệu thật'

  const targetDescription = horizon === '30min'
    ? 'Mốc quan trắc tiếp theo'
    : horizon === '1d'
      ? `Bắt đầu ngày dự báo ${forecast?.target_date_hst || '—'} (Hawaii)`
      : horizon === '30d'
        ? `Kết thúc giai đoạn 30 ngày, ngày ${forecast?.target_date_hst || '—'} (Hawaii)`
        : `Kết thúc ngày mục tiêu ${forecast?.target_date_hst || '—'} (Hawaii)`
  const targetDisplayAt = forecast && horizon === '1d'
    ? new Date(Date.parse(forecast.target_at) - 86_400_000).toISOString()
    : forecast?.target_at ?? ''

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-5 space-y-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold uppercase text-sky-400">
            {horizon}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
              error
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                : !forecast
                  ? 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                  : isEvaluated
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            {stateLabel}
          </span>
        </div>
        <h3 className="text-base font-bold text-white">{meta.title}</h3>
        <p className="text-xs text-slate-400">{meta.subtitle}</p>
      </div>

      {forecast ? (
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div>
            <span className="text-[11px] text-slate-400 font-mono">Giá trị dự báo (WVHT):</span>
            <div className="text-2xl font-bold text-sky-300 tabular-nums">
              {metres(forecast.predicted_value)}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <span className="font-semibold text-slate-300">Thời gian tạo dự đoán</span>
              <ThreeZoneTime iso={forecast.issued_at} />
            </div>

            <div className="rounded-lg border border-sky-900/60 bg-sky-950/20 p-3">
              <span className="font-semibold text-sky-300">Mục tiêu dự đoán</span>
              <p className="mt-0.5 text-[11px] text-slate-400">{targetDescription}</p>
              <ThreeZoneTime iso={targetDisplayAt} />
            </div>

            {isEvaluated ? (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                <div>
                  <span className="text-slate-400">Giá trị thực tế:</span>
                  <p className="text-emerald-400 font-bold font-mono">{metres(forecast.actual_value)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Sai số tuyệt đối:</span>
                  <p className="text-amber-300 font-bold font-mono">{metres(forecast.absolute_error)}</p>
                </div>
              </div>
            ) : (
              <div className="pt-2 text-[11px] text-slate-400 font-mono border-t border-slate-800/60">
                <span>Dự kiến nhận kết quả:</span>
                <p className="text-amber-300/90 font-sans mt-0.5">
                  Sau khi NOAA công bố và dữ liệu qua kiểm định QC
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`py-6 px-3 text-center text-xs border border-dashed rounded-lg ${error ? 'text-rose-300 border-rose-900/60' : 'text-slate-300 border-slate-800'}`}>
          {error ? `Không thể tải dự báo: ${error}`
            : loading ? 'Đang tải dữ liệu dự báo...'
              : horizon === '30min'
                ? 'Chưa có dự báo. Cần đủ quan trắc đã kiểm định cho các mốc hiện tại, 30 phút, 1 giờ và 3 giờ trước.'
                : horizon === '1d'
                  ? 'Đang chờ dự báo cho ngày mai theo giờ Hawaii.'
                  : 'Chưa có dự báo. Cần ít nhất 7 ngày Hawaii liên tiếp có dữ liệu đạt kiểm định để tạo đầu vào.'}
        </div>
      )}

      <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono flex items-start justify-between gap-2">
        <span className="min-w-0 break-all">Model: {forecast?.model_version || 'Calisthenics 1.5'}</span>
        <span className="shrink-0 text-amber-400/80">Thử nghiệm</span>
      </div>
    </div>
  )
}

export default function ForecastPage() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'classification'>('forecast')
  const [shadowForecasts, setShadowForecasts] = useState<Record<ForecastHorizon, IssuedForecast[]>>({
    '30min': [],
    '1d': [],
    '7d': [],
    '30d': [],
  })
  const [loading, setLoading] = useState(true)
  const [forecastErrors, setForecastErrors] = useState<Record<ForecastHorizon, string | null>>({
    '30min': null,
    '1d': null,
    '7d': null,
    '30d': null,
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [historyHorizonFilter, setHistoryHorizonFilter] = useState<'all' | ForecastHorizon>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [historyPage, setHistoryPage] = useState(1)
  const PAGE_SIZE = 15

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setForecastErrors({ '30min': null, '1d': null, '7d': null, '30d': null })

    Promise.allSettled([
      getShadowForecasts('30min', controller.signal),
      getShadowForecasts('1d', controller.signal),
      getShadowForecasts('7d', controller.signal),
      getShadowForecasts('30d', controller.signal),
    ])
      .then((results) => {
        if (controller.signal.aborted) return
        const forecasts = {} as Record<ForecastHorizon, IssuedForecast[]>
        const errors = {} as Record<ForecastHorizon, string | null>
        HORIZONS.forEach((horizon, index) => {
          const result = results[index]
          forecasts[horizon] = result.status === 'fulfilled' ? result.value : []
          errors[horizon] = result.status === 'rejected'
            ? result.reason instanceof Error ? result.reason.message : 'Lỗi không xác định'
            : null
        })
        setShadowForecasts(forecasts)
        setForecastErrors(errors)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [refreshKey])

  const todayHST = hstToday()
  const latestByHorizon = useMemo(() => {
    const tomorrow = new Date(`${todayHST}T00:00:00Z`)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const targetDay = tomorrow.toISOString().slice(0, 10)
    const map: Partial<Record<ForecastHorizon, IssuedForecast>> = {}
    HORIZONS.forEach((h) => {
      const list = shadowForecasts[h]
      map[h] = h === '1d'
        ? list.find(forecast => forecast.target_date_hst === targetDay && hstToday(new Date(forecast.issued_at)) === todayHST)
        : list[0]
    })
    return map
  }, [shadowForecasts, todayHST])

  // Lịch sử toàn bộ dự báo
  const allHistoryRows = useMemo(() => {
    const merged: IssuedForecast[] = []
    HORIZONS.forEach((h) => {
      merged.push(...shadowForecasts[h])
    })
    return merged.sort((a, b) => {
      const tA = Date.parse(a.issued_at)
      const tB = Date.parse(b.issued_at)
      return sortOrder === 'desc' ? tB - tA : tA - tB
    })
  }, [shadowForecasts, sortOrder])

  // Lọc lịch sử
  const filteredHistory = useMemo(() => {
    if (historyHorizonFilter === 'all') return allHistoryRows
    return allHistoryRows.filter((r) => r.horizon === historyHorizonFilter)
  }, [allHistoryRows, historyHorizonFilter])

  // Phân trang lịch sử
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * PAGE_SIZE
    return filteredHistory.slice(start, start + PAGE_SIZE)
  }, [filteredHistory, historyPage])

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE) || 1

  return (
    <main className="w-full min-w-0 px-4 py-6 text-slate-100 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider mb-1">
            <TrendingUp size={15} />
            <span>{activeTab === 'forecast' ? 'Mô hình Calisthenics 1.5 · Thử nghiệm & Theo dõi ngầm' : 'Phân loại cấp sóng theo ngày Hawaii'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dự đoán và phân loại</h1>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            {activeTab === 'forecast'
              ? 'Kết quả dự báo độ cao sóng thử nghiệm theo các kỳ hạn 30 phút, 1 ngày, 7 ngày và 30 ngày từ mô hình Calisthenics 1.5.'
              : 'Kết quả phân nhóm độ cao sóng theo ngày.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* TAB SWITCHER */}
          <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'forecast'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dự đoán sóng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('classification')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeTab === 'classification'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Phân loại cấp sóng
            </button>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-sky-400' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* TOP STRIP: REALTIME DUAL CLOCKS (VN & HAWAII) & NOTICE */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#0c121e]">
        <DualTimeClock />

        {activeTab === 'forecast' && <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Trạng thái: Thử nghiệm / Đang theo dõi (DRAFT)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Nguồn: Calisthenics 1.5 Shadow</span>
        </div>}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DỰ ĐOÁN */}
      {/* ========================================================================= */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* CHÚ GIẢI THUẬT NGỮ */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Chú giải thuật ngữ:</strong> <strong>WVHT</strong> (Significant Wave Height) là độ cao sóng có ý nghĩa (đơn vị mét - m).
              </p>
              <p className="text-slate-400 text-[11px]">
                Mốc 7 ngày là dự báo giá trị trung vị của riêng ngày thứ 7; mốc 30 ngày là giá trị trung bình của cả giai đoạn 30 ngày tiếp theo.
                Dự báo được tạo tự động và đối chiếu độc lập với dữ liệu trạm NOAA 51201 khi có kết quả quan trắc thực tế.
              </p>
            </div>
          </div>

          {/* 4 CARDS THEO 4 KỲ HẠN */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Waves size={16} className="text-sky-400" />
              <span>Dự báo sóng theo 4 kỳ hạn</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
              {HORIZONS.map((h) => (
                <HorizonCard key={h} horizon={h} forecast={latestByHorizon[h]} loading={loading} error={forecastErrors[h]} />
              ))}
            </div>
          </div>

          {/* BẢNG LỊCH SỬ DỰ BÁO */}
          <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-sky-400" />
                  <span>Lịch sử phát hành &amp; Đối chiếu dự báo</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Theo dõi sai số thực tế giữa giá trị mô hình Calisthenics 1.5 dự đoán và quan trắc phao NOAA 51201
                </p>
              </div>

              {/* FILTERS */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Lọc kỳ hạn:</span>
                  <select
                    value={historyHorizonFilter}
                    onChange={(e) => {
                      setHistoryHorizonFilter(e.target.value as any)
                      setHistoryPage(1)
                    }}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  >
                    <option value="all">Tất cả kỳ hạn</option>
                    <option value="30min">30 phút</option>
                    <option value="1d">1 ngày</option>
                    <option value="7d">7 ngày</option>
                    <option value="30d">30 ngày</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Sắp xếp:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  >
                    <option value="desc">Mới nhất trước</option>
                    <option value="asc">Cũ nhất trước</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Mô hình</th>
                    <th className="py-2.5 px-3">Kỳ hạn</th>
                    <th className="py-2.5 px-3">Thời gian tạo (VN)</th>
                    <th className="py-2.5 px-3">Mục tiêu (VN / HST)</th>
                    <th className="py-2.5 px-3">Giá trị dự báo</th>
                    <th className="py-2.5 px-3">Thời gian đối chiếu</th>
                    <th className="py-2.5 px-3">Giá trị thực tế</th>
                    <th className="py-2.5 px-3">Sai số tuyệt đối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-500 font-mono">
                        Không có bản ghi dự báo nào thỏa điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((row) => {
                      const isEvaluated = row.actual_value != null && row.evaluated_at
                      return (
                        <tr key={row.forecast_id} className="hover:bg-slate-900/50 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-300 text-xs">
                            {row.model_version}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                            {row.horizon}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {formatVN(row.issued_at)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                            {row.target_date_hst
                              ? `${row.target_date_hst} (HST)`
                              : formatVN(row.target_at)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-300">
                            {metres(row.predicted_value)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {row.evaluated_at ? formatVN(row.evaluated_at) : <span className="text-slate-600">Chưa đối chiếu</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {isEvaluated ? (
                              <span className="text-emerald-400">{metres(row.actual_value)}</span>
                            ) : (
                              <span className="text-slate-600 font-normal">Chờ quan trắc</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {row.absolute_error != null ? (
                              <span className="text-amber-300">{metres(row.absolute_error)}</span>
                            ) : (
                              <span className="text-slate-600 font-normal">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span className="font-mono">
                Tổng cộng {filteredHistory.length} bản ghi dự báo Calisthenics 1.5
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-200 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono px-2">
                  Trang {historyPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={historyPage >= totalPages}
                  onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-200 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHÂN LOẠI */}
      {/* ========================================================================= */}
      {activeTab === 'classification' && (
        <div className="space-y-4">
          <ClusterScatterPanel refreshKey={refreshKey} />
          <WaveClassificationPanel refreshKey={refreshKey} />
        </div>
      )}
    </main>
  )
}
