import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Compass,
  Database,
  Droplets,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Waves,
  Wifi,
  ExternalLink,
  Code2,
  Info,
  CheckCircle2,
  Clock,
  Layers3,
  Sparkles,
  AlertTriangle,
  FileCode2,
  X,
  Server,
  ArrowRight,
} from 'lucide-react'

import { loadLatest, getStationInfo, checkBackendHealth, type StationData } from '../../api/client'
import type { LatestObservation } from '../../api/types'

function formatValue(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) {
    return 'Chưa có dữ liệu'
  }
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`
}

function formatDateHST(value?: string) {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Pacific/Honolulu',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date) + ' (HST)'
}

function formatDateVN(value?: string) {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date) + ' (VN)'
}

type MetricCardProps = {
  title: string
  code: string
  value: string
  description: string
  icon: ReactNode
  color?: string
  loading: boolean
}

function MetricCard({
  title,
  code,
  value,
  description,
  icon,
  color = 'text-sky-400',
  loading,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-4 transition-all duration-200 hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-slate-400 uppercase">{code}</span>
          <h3 className="text-sm font-medium text-slate-200 mt-0.5">{title}</h3>
        </div>
        <div className={`rounded-lg bg-slate-900 border border-slate-800 p-2 ${color}`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="mt-4 h-8 w-28 animate-pulse rounded bg-slate-800" />
      ) : (
        <div className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</div>
      )}
      <p className="mt-2 text-[11px] text-slate-400 font-mono">{description}</p>
    </div>
  )
}

type ApiEndpointItem = {
  method: 'GET' | 'POST'
  path: string
  name: string
  description: string
  status: 'active' | 'ready'
  sampleJson: Record<string, unknown>
}

const API_ENDPOINTS: ApiEndpointItem[] = [
  {
    method: 'GET',
    path: '/api/v1/stations/51201',
    name: 'Thông tin trạm phao',
    description: 'Cung cấp metadata tọa độ, tên trạm NOAA 51201 / CDIP 106 và múi giờ Hawaii',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data: {
        station_id: '51201',
        station_name: 'Waimea Bay (CDIP 106)',
        location_name: 'Waimea Bay, Oahu, Hawaii',
        latitude: 21.671,
        longitude: -158.118,
        timezone: 'Pacific/Honolulu',
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/observations/latest',
    name: 'Quan trắc mới nhất',
    description: 'Bản ghi quan trắc sóng và thời tiết biển thời gian thực gần nhất đã qua chuẩn hóa',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data_type: 'observation',
      data: {
        station_id: '51201',
        observed_at: '2026-11-15T09:26:00Z',
        wave_height_m: 2.2,
        dominant_period_s: 12.0,
        average_period_s: 7.2,
        mean_wave_direction_deg: 330.0,
        sea_surface_temp_c: 25.8,
        quality_status: 'valid',
        source_kind: 'realtime',
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/observations',
    name: 'Tra cứu chuỗi quan trắc',
    description: 'Truy vấn quan trắc tầng Silver sạch theo khoảng thời gian và phân trang cursor',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data: [
        {
          station_id: '51201',
          observed_at: '2026-11-15T09:26:00Z',
          wave_height_m: 2.2,
          dominant_period_s: 12.0,
          quality_status: 'valid',
        },
      ],
      has_more: true,
      next_cursor: '2026-11-15T08:56:00Z',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/analytics/time-series/overview',
    name: 'Tổng hợp chuỗi thời gian',
    description: 'Dữ liệu tổng hợp theo Day/Week/Month, phân bố Histogram và cặp Scatter WVHT-DPD',
    status: 'active',
    sampleJson: {
      status: 'ok',
      metric: 'WVHT',
      timezone: 'UTC',
      qc_only: true,
      summary: {
        day: [{ period_start: '2026-11-14', sample_count: 48, mean_value: 2.12, median_value: 2.1 }],
      },
      histogram: [{ bin: 2.0, sample_count: 14 }],
    },
  },
  {
    method: 'GET',
    path: '/api/v1/forecasts/shadow/latest?horizon=30min',
    name: 'Dự báo ngầm Calisthenics 1.5',
    description: 'Kết quả dự báo tức thời và đối chiếu thực tế theo các mốc 30m, 1d, 7d, 30d',
    status: 'active',
    sampleJson: {
      status: 'ok',
      quality_status: 'experimental',
      model_family: 'calisthenics 1.5',
      data: [
        {
          forecast_id: 1453,
          model_id: 28,
          horizon: '30min',
          issued_at: '2026-11-15T09:16:02Z',
          target_at: '2026-11-15T09:56:00Z',
          predicted_value: 2.24,
          actual_value: null,
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api/v1/clusters',
    name: 'Phân nhóm điều kiện sóng (K-Means)',
    description: 'Lịch sử gán cụm điều kiện sóng K-Means theo từng ngày HST',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data: [{ model_id: 10, date_hst: '2026-11-11', cluster_label: 1, distance_to_centroid: 2.65 }],
    },
  },
  {
    method: 'GET',
    path: '/api/v1/models',
    name: 'Danh mục mô hình Model Registry',
    description: 'Danh sách toàn bộ các mô hình học máy, thuật toán và chỉ số kiểm định MAE/RMSE',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data: [
        {
          model_id: 28,
          model_name: 'calisthenics 1.5 / 30min',
          task_type: 'regression',
          algorithm: 'SGDRegressor',
          status: 'draft',
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api/v1/data-quality/overview',
    name: 'Tổng quan chất lượng dữ liệu',
    description: 'Độ phủ dữ liệu hàng ngày (coverage ratio), số mẫu hợp lệ và danh sách cảnh báo QC',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data: {
        daily: [{ date_hst: '2026-11-14', sample_count: 48, valid_wave_count: 48, coverage_ratio: 1.0 }],
        issues: [],
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/data-freshness',
    name: 'Độ tươi mới dữ liệu',
    description: 'Thời điểm thu thập gần nhất, độ trễ quan trắc so với thời gian thực và chu kỳ polling',
    status: 'active',
    sampleJson: {
      status: 'ok',
      data: {
        station_id: '51201',
        last_observed_at: '2026-11-15T09:26:00Z',
        source_age_minutes: 18.5,
        source_status: 'ok',
      },
    },
  },
]

export default function DashboardPage() {
  const [activeSubTab, setActiveSubTab] = useState<'station-api' | 'about'>('station-api')
  const [data, setData] = useState<LatestObservation | null>(null)
  const [station, setStation] = useState<StationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedApiJson, setSelectedApiJson] = useState<{ name: string; path: string; json: unknown } | null>(null)
  const [backendReady, setBackendReady] = useState<boolean>(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    Promise.all([
      loadLatest(controller.signal).catch((err) => {
        console.warn('Lỗi loadLatest:', err)
        return null
      }),
      getStationInfo(controller.signal).catch((err) => {
        console.warn('Lỗi getStationInfo:', err)
        return null
      }),
      checkBackendHealth().then((h) => h.status === 'ok').catch(() => false),
    ])
      .then(([latestRes, stationRes, isReady]) => {
        if (!controller.signal.aborted) {
          if (latestRes?.data) setData(latestRes.data)
          if (stationRes) setStation(stationRes)
          setBackendReady(isReady)
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(String(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [refreshKey])

  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <main className="w-full min-w-0 px-4 py-6 text-slate-100 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider mb-1">
            <Waves size={15} />
            <span>Waimea WaveCast · Trạm phao NOAA 51201</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tổng quan trạm &amp; Hệ thống</h1>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            Theo dõi tình trạng vận hành, chỉ số hải văn mới nhất tại Vịnh Waimea và danh mục API công khai của hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TAB BUTTONS */}
          <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('station-api')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeSubTab === 'station-api'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Thông tin trạm &amp; API
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('about')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                activeSubTab === 'about'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Về Waimea WaveCast
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

      {/* ERROR BANNER */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-300">Không thể kết nối hoặc tải dữ liệu</p>
            <p className="mt-1 text-slate-400 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* TAB 1: THÔNG TIN TRẠM VÀ API */}
      {activeSubTab === 'station-api' && (
        <div className="space-y-6">
          {/* STATION HERO CHIP */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-800 bg-[#0c121e]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Compass size={20} />
              </div>
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase">Trạm quan trắc</p>
                <p className="text-sm font-bold text-white">NOAA 51201 / CDIP 106</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-mono text-slate-400 uppercase">Vị trí địa lý</p>
              <p className="text-sm font-semibold text-slate-200">
                {station?.latitude ?? 21.671}° N, {station?.longitude ?? -158.118}° W
              </p>
              <p className="text-[11px] text-slate-500">Waimea Bay, Oahu, Hawaii</p>
            </div>

            <div>
              <p className="text-[11px] font-mono text-slate-400 uppercase">Múi giờ chuẩn</p>
              <p className="text-sm font-semibold text-slate-200">HST (Pacific/Honolulu)</p>
              <p className="text-[11px] text-slate-500">UTC-10 (Lệch 17h so với VN)</p>
            </div>

            <div>
              <p className="text-[11px] font-mono text-slate-400 uppercase">Cập nhật gần nhất</p>
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {data?.observed_at ? formatDateHST(data.observed_at) : 'Chưa có dữ liệu'}
              </p>
              <p className="text-[11px] text-slate-500">
                {data?.observed_at ? formatDateVN(data.observed_at) : ''}
              </p>
            </div>
          </div>

          {/* METRIC KPI CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity size={16} className="text-sky-400" />
                <span>Chỉ số quan trắc mới nhất</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                Trạng thái QC: <span className="text-emerald-400 font-bold">{data?.quality_flag ?? 'valid'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                code="WVHT"
                title="Độ cao sóng có ý nghĩa"
                value={formatValue(data?.wave_height_m, 'm')}
                description="Significant Wave Height"
                icon={<Waves size={20} />}
                color="text-sky-400"
                loading={loading}
              />
              <MetricCard
                code="DPD"
                title="Chu kỳ sóng trội"
                value={formatValue(data?.dominant_period_s, 's')}
                description="Dominant Wave Period"
                icon={<Activity size={20} />}
                color="text-amber-400"
                loading={loading}
              />
              <MetricCard
                code="MWD"
                title="Hướng sóng trung bình"
                value={formatValue(data?.wave_direction_deg, '°')}
                description="Mean Wave Direction"
                icon={<Compass size={20} />}
                color="text-violet-400"
                loading={loading}
              />
              <MetricCard
                code="WTMP"
                title="Nhiệt độ mặt nước biển"
                value={formatValue(data?.sea_temperature_c, '°C')}
                description="Sea Surface Temperature"
                icon={<Droplets size={20} />}
                color="text-emerald-400"
                loading={loading}
              />
            </div>
          </div>

          {/* API WEBSITE SECTION */}
          <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Server size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">API website đang sử dụng</h2>
                  <p className="text-xs text-slate-400">
                    Hệ thống REST API backend phục vụ các màn hình tra cứu, phân tích và học máy
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">URL gốc:</span>
                <code className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sky-300">
                  https://apiwaimea.liems.io.vn/api/v1
                </code>
              </div>
            </div>

            {/* TABLE OF ENDPOINTS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Phương thức</th>
                    <th className="py-2.5 px-3">Endpoint công khai</th>
                    <th className="py-2.5 px-3">Chức năng</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Phản hồi mẫu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {API_ENDPOINTS.map((ep) => (
                    <tr key={ep.path} className="hover:bg-slate-900/50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[11px]">
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-200 text-xs">
                        {ep.path}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-xs">
                        <span className="font-medium text-white">{ep.name}:</span>{' '}
                        <span className="text-slate-400">{ep.description}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={11} /> Hoạt động
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedApiJson({ name: ep.name, path: ep.path, json: ep.sampleJson })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
                        >
                          <FileCode2 size={13} className="text-sky-400" />
                          <span>Xem JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>Bảo mật:</strong> Các endpoint trên là cổng công khai (Public Read-only). Toàn bộ token quản trị,
                cổng cơ sở dữ liệu và URI lưu trữ đám mây private GCS được bảo vệ an toàn trên tầng máy chủ.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VỀ WAIMEA WAVECAST */}
      {activeSubTab === 'about' && (
        <div className="space-y-6">
          {/* INTRO HERO */}
          <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider">
              <Info size={16} />
              <span>Giới thiệu dự án Khai phá dữ liệu</span>
            </div>
            <h2 className="text-xl font-bold text-white">Dự án Waimea WaveCast — Hải văn &amp; Sóng biển Vịnh Waimea</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
              <strong>Waimea WaveCast</strong> là hệ thống nghiên cứu và phân tích chuỗi thời gian khí tượng hải văn,
              được xây dựng dựa trên nguồn dữ liệu quan trắc phao biển từ Cơ quan Quản lý Khí quyển và Đại dương Quốc gia
              Hoa Kỳ (<strong>NOAA NDBC</strong>) và Chương trình Đo lường Dữ liệu Bờ biển (<strong>CDIP</strong>) tại trạm phao <strong>51201</strong> (Waimea Bay, Oahu, Hawaii).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Trạm quan trắc</span>
                <p className="text-sm font-bold text-white mt-1">NOAA 51201 · CDIP 106</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Một phao vật lý đo lường chung</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Lịch sử tích lũy</span>
                <p className="text-sm font-bold text-white mt-1">2004 → Hiện tại</p>
                <p className="text-[11px] text-slate-500 mt-0.5">&gt; 312.000 bản ghi chuẩn hóa</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Chu kỳ cập nhật</span>
                <p className="text-sm font-bold text-white mt-1">Mỗi 30 phút</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Khớp lịch công bố NOAA NDBC</p>
              </div>
            </div>
          </div>

          {/* MEDALLION ARCHITECTURE */}
          <div className="rounded-xl border border-slate-800 bg-[#0c121e] p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers3 size={18} className="text-sky-400" />
                <span>Kiến trúc dữ liệu Medallion Lakehouse</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Quy trình xử lý dữ liệu qua 3 tầng nghiêm ngặt nhằm đảm bảo tính toàn vẹn và độ tin cậy khoa học.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300">
                    BRONZE LAYER
                  </span>
                  <span className="text-xs text-slate-500">Dữ liệu thô</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Lưu trữ nguyên trạng</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Thu thập nguyên văn chuỗi văn bản (standard meteorological feeds) từ NOAA, lưu trữ bất biến lên
                  Google Cloud Storage và bảng raw database kèm mã băm SHA-256 để đối chiếu.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-400/20 bg-slate-400/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-400/20 text-slate-200">
                    SILVER LAYER
                  </span>
                  <span className="text-xs text-slate-500">Làm sạch &amp; QC</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Chuẩn hóa &amp; Gắn nhãn chất lượng</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Chuyển đổi thời gian về chuẩn ISO UTC, kiểm tra tính hợp lệ vật lý, lọc bỏ missing flags (99.0, 999.0),
                  tính toán đặc trưng ngày theo giờ Hawaii (HST) và gắn cờ chất lượng (valid, suspect, imputed).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-400/20 bg-yellow-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-yellow-400/20 text-yellow-300">
                    GOLD LAYER
                  </span>
                  <span className="text-xs text-slate-500">Phân tích &amp; ML</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Tổng hợp &amp; Mô hình học máy</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Phân rã chuỗi thời gian theo ngày/tuần/tháng, ma trận tương quan biến hải văn, phân cụm điều kiện sóng K-Means
                  và mô hình học máy Calisthenics 1.5 với cơ chế shadow evaluation.
                </p>
              </div>
            </div>
          </div>

          {/* SCIENTIFIC LIMITATIONS */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-5 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle size={17} />
              <span>Giới hạn khoa học &amp; Cảnh báo an toàn thử nghiệm</span>
            </div>
            <p className="leading-relaxed">
              Các mô hình dự báo và phân cụm trên website (như Calisthenics 1.5 và K-Means) là sản phẩm phục vụ nghiên cứu
              đồ án môn học Khai phá dữ liệu. Hiện các mô hình đang trong giai đoạn theo dõi đối chiếu ngầm (shadow tracking)
              và mang trạng thái DRAFT.
            </p>
            <p className="leading-relaxed text-slate-400">
              Tuyệt đối <strong>không sử dụng</strong> các kết quả dự báo thử nghiệm trên trang web này để thay thế cho
              các thông báo cứu nạn, bản tin dự báo thời tiết biển chính thức của NOAA hoặc các quyết định an toàn bơi lội/lướt sóng ngoài khơi.
            </p>
          </div>
        </div>
      )}

      {/* JSON PREVIEW MODAL */}
      {selectedApiJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0c121e] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
              <div>
                <span className="text-xs font-mono text-sky-400 font-semibold">{selectedApiJson.path}</span>
                <h3 className="text-sm font-bold text-white">{selectedApiJson.name} (Phản hồi JSON mẫu)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApiJson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-300 bg-[#070b12]">
              <pre>{JSON.stringify(selectedApiJson.json, null, 2)}</pre>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
              <span>Định dạng chuẩn REST API (Status 200 OK)</span>
              <button
                type="button"
                onClick={() => setSelectedApiJson(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
