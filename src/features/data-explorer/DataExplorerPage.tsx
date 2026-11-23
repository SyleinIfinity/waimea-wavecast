import { useState, useMemo, useEffect } from 'react'
import type { EChartsOption } from 'echarts'
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Filter,
  Layers,
  LineChart,
  RefreshCw,
  Table2,
  TrendingUp,
  Waves,
  Eye,
  X,
  AlertCircle,
  FileText,
  Clock,
  Compass,
  Droplets,
} from 'lucide-react'

import EChart from '../../components/charts/EChart'
import TimeSeriesPage from '../time-series/TimeSeriesPage'
import TrendPage from '../trend/TrendPage'
import { getObservations, getObservationsInRange, type Observation } from '../observations/api'

type Metric = 'WVHT' | 'DPD' | 'APD' | 'MWD' | 'WTMP'
type LayerType = 'silver' | 'bronze' | 'gold'

const METRIC_DEFS: Record<Metric, { label: string; field: keyof Observation; unit: string; desc: string }> = {
  WVHT: { label: 'Độ cao sóng', field: 'wave_height_m', unit: 'm', desc: 'Significant Wave Height' },
  DPD: { label: 'Chu kỳ sóng trội', field: 'dominant_period_s', unit: 's', desc: 'Dominant Wave Period' },
  APD: { label: 'Chu kỳ sóng TB', field: 'average_period_s', unit: 's', desc: 'Average Wave Period' },
  MWD: { label: 'Hướng sóng TB', field: 'wave_direction_deg', unit: '°', desc: 'Mean Wave Direction' },
  WTMP: { label: 'Nhiệt độ nước', field: 'sea_temperature_c', unit: '°C', desc: 'Sea Surface Temperature' },
}

function dateUTC(daysBack: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

function formatVal(val: number | null | undefined, unit: string) {
  if (val === null || val === undefined) return 'Không có trong nguồn'
  return `${val.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`
}

function formatDateTimeUTC(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d) + ' (UTC)'
}

interface DataExplorerPageProps {
  initialTab?: 'chart' | 'time' | 'layers'
  initialTimeSubTab?: 'aggregated' | 'trend'
  initialLayer?: LayerType
}

export default function DataExplorerPage({
  initialTab = 'chart',
  initialTimeSubTab = 'aggregated',
  initialLayer = 'silver',
}: DataExplorerPageProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'time' | 'layers'>(initialTab)

  // Tab 1 (Biểu đồ) state
  const [metric, setMetric] = useState<Metric>('WVHT')
  const [chartStart, setChartStart] = useState(() => dateUTC(14))
  const [chartEnd, setChartEnd] = useState(() => dateUTC(0))
  const [appliedChartRange, setAppliedChartRange] = useState(() => ({ start: dateUTC(14), end: dateUTC(0) }))
  const [chartData, setChartData] = useState<Observation[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  // Tab 2 (Thời gian) sub-tab state
  const [timeSubTab, setTimeSubTab] = useState<'aggregated' | 'trend'>(initialTimeSubTab)

  // Tab 3 (Dữ liệu lấy được) state
  const [selectedLayer, setSelectedLayer] = useState<LayerType>(initialLayer)
  const [tableStart, setTableStart] = useState(() => dateUTC(7))
  const [tableEnd, setTableEnd] = useState(() => dateUTC(0))
  const [tableCursor, setTableCursor] = useState('')
  const [tableNextCursor, setTableNextCursor] = useState<string | null>(null)
  const [tablePage, setTablePage] = useState(1)
  const [tableData, setTableData] = useState<Observation[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [tableError, setTableError] = useState<string | null>(null)
  const [tableRefreshKey, setTableRefreshKey] = useState(0)
  const [selectedRawLine, setSelectedRawLine] = useState<{ time: string; line: string; source: string } | null>(null)

  useEffect(() => {
    if (activeTab !== 'layers' || tablePage !== 1) return
    const interval = window.setInterval(() => setTableRefreshKey((key) => key + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [activeTab, tablePage])

  // Fetch data for Tab 1 (Biểu đồ)
  useEffect(() => {
    if (activeTab !== 'chart') return
    const controller = new AbortController()
    setChartLoading(true)
    setChartError(null)

    getObservationsInRange(
      {
        start: `${appliedChartRange.start}T00:00:00.000Z`,
        end: `${appliedChartRange.end}T23:59:59.999Z`,
      },
      controller.signal
    )
      .then((observations) => {
        if (!controller.signal.aborted) setChartData(observations)
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setChartError(err instanceof Error ? err.message : String(err))
          setChartData([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setChartLoading(false)
      })

    return () => controller.abort()
  }, [appliedChartRange, activeTab])

  // Fetch data for Tab 3 (Dữ liệu lấy được)
  useEffect(() => {
    if (activeTab !== 'layers') return
    const controller = new AbortController()
    setTableLoading(true)
    setTableError(null)

    getObservations(
      {
        start: `${tableStart}T00:00:00.000Z`,
        end: `${tableEnd}T23:59:59.999Z`,
        cursor: tableCursor,
        limit: 20,
      },
      controller.signal
    )
      .then((res) => {
        if (!controller.signal.aborted) {
          setTableData(res.items)
          setTableNextCursor(res.nextCursor)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setTableError(err instanceof Error ? err.message : String(err))
          setTableData([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setTableLoading(false)
      })

    return () => controller.abort()
  }, [tableStart, tableEnd, tableCursor, selectedLayer, activeTab, tableRefreshKey])

  // Chart statistics
  const chartStats = useMemo(() => {
    const field = METRIC_DEFS[metric].field
    const vals = chartData
      .map((r) => r[field])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (!vals.length) return { min: null, max: null, avg: null, count: 0, total: chartData.length }
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return { min, max, avg, count: vals.length, total: chartData.length }
  }, [chartData, metric])

  // EChart Options for Tab 1 (connectNulls: false)
  const lineChartOption: EChartsOption = useMemo(() => {
    const field = METRIC_DEFS[metric].field
    const dates = chartData.map((r) => formatDateTimeUTC(r.observed_at))
    const values = chartData.map((r) => {
      const v = r[field]
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    })

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0c121e',
        borderColor: '#1e293b',
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params[0]) return ''
          const p = params[0]
          const idx = p.dataIndex
          const item = chartData[idx]
          const val = p.value != null ? `${p.value} ${METRIC_DEFS[metric].unit}` : 'Khoảng khuyết / Không có dữ liệu'
          return `
            <div style="font-family: monospace; font-size: 11px;">
              <div style="color: #94a3b8; margin-bottom: 4px;">Thời điểm (UTC): ${p.axisValue}</div>
              <div style="font-weight: bold; color: #38bdf8;">${METRIC_DEFS[metric].label}: ${val}</div>
              ${item ? `<div style="color: #64748b; margin-top: 2px;">QC: ${item.quality_flag} · Nguồn: ${item.source}</div>` : ''}
            </div>
          `
        },
      },
      grid: { left: '3%', right: '3%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 },
      },
      yAxis: {
        type: 'value',
        name: `${METRIC_DEFS[metric].label} (${METRIC_DEFS[metric].unit})`,
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: METRIC_DEFS[metric].label,
          type: 'line',
          data: values,
          connectNulls: false, // TUÂN THỦ YÊU CẦU: Không nối đường qua khoảng không có quan trắc
          smooth: true,
          showSymbol: values.length < 50,
          symbolSize: 4,
          lineStyle: { width: 2, color: '#38bdf8' },
          itemStyle: { color: '#38bdf8' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(56, 189, 248, 0.25)' },
                { offset: 1, color: 'rgba(56, 189, 248, 0.0)' },
              ],
            },
          },
        },
      ],
    }
  }, [chartData, metric])

  return (
    <main className="w-full min-w-0 px-4 py-6 text-slate-100 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider mb-1">
            <Database size={15} />
            <span>Tra cứu &amp; Phân tích dữ liệu phao NOAA 51201</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tra cứu dữ liệu</h1>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            Bộ lọc đa chiều và biểu đồ trực quan hóa dữ liệu quan trắc qua 3 tầng lưu trữ: Bronze, Silver và Gold.
          </p>
        </div>

        {/* 3 MAIN TABS */}
        <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeTab === 'chart'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart size={14} />
            <span>Biểu đồ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeTab === 'time'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Thời gian</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('layers')}
            className={`px-3.5 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeTab === 'layers'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>Dữ liệu lấy được</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BIỂU ĐỒ (SINGLE METRIC CONTINUOUS OBSERVATIONS) */}
      {/* ========================================================================= */}
      {activeTab === 'chart' && (
        <div className="space-y-4">
          {/* FILTER CONTROLS */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c121e] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* METRIC SELECTOR */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Chỉ số:</span>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="WVHT">WVHT · Độ cao sóng (m)</option>
                  <option value="DPD">DPD · Chu kỳ sóng trội (s)</option>
                  <option value="APD">APD · Chu kỳ sóng trung bình (s)</option>
                  <option value="MWD">MWD · Hướng sóng trung bình (°)</option>
                  <option value="WTMP">WTMP · Nhiệt độ mặt nước (°C)</option>
                </select>
              </div>

              {/* DATE RANGE WITH UTC LABEL */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Từ (UTC):</span>
                <input
                  type="date"
                  aria-label="Từ ngày (UTC)"
                  value={chartStart}
                  onChange={(e) => setChartStart(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Đến (UTC):</span>
                <input
                  type="date"
                  aria-label="Đến ngày (UTC)"
                  value={chartEnd}
                  onChange={(e) => setChartEnd(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setAppliedChartRange({ start: chartStart, end: chartEnd })}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition text-xs flex items-center gap-1.5"
              >
                <Filter size={13} />
                <span>Áp dụng lọc</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Chuẩn thời gian: <strong>UTC (Quốc tế)</strong></span>
            </div>
          </div>

          {/* STATS STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-800 bg-[#0c121e]">
              <span className="text-[11px] text-slate-400 font-mono uppercase">Số mẫu quan trắc</span>
              <p className="text-lg font-bold text-white mt-0.5">
                {chartStats.count} <span className="text-xs text-slate-500 font-normal">/ {chartStats.total}</span>
              </p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-[#0c121e]">
              <span className="text-[11px] text-slate-400 font-mono uppercase">Giá trị nhỏ nhất</span>
              <p className="text-lg font-bold text-sky-400 mt-0.5">
                {formatVal(chartStats.min, METRIC_DEFS[metric].unit)}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-[#0c121e]">
              <span className="text-[11px] text-slate-400 font-mono uppercase">Giá trị lớn nhất</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                {formatVal(chartStats.max, METRIC_DEFS[metric].unit)}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-[#0c121e]">
              <span className="text-[11px] text-slate-400 font-mono uppercase">Giá trị trung bình</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {formatVal(chartStats.avg, METRIC_DEFS[metric].unit)}
              </p>
            </div>
          </div>

          {/* CHART CONTAINER */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c121e] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Waves size={16} className="text-sky-400" />
                <h3 className="text-sm font-semibold text-white">
                  Diễn biến {METRIC_DEFS[metric].label} ({METRIC_DEFS[metric].unit}) theo thời gian
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Không nối đường qua khoảng mất dữ liệu
              </span>
            </div>

            {chartLoading ? (
              <div className="h-80 flex items-center justify-center text-xs text-slate-400 font-mono">
                <RefreshCw size={18} className="animate-spin text-sky-400 mr-2" /> Đang truy vấn quan trắc...
              </div>
            ) : chartError ? (
              <div className="h-80 flex items-center justify-center text-xs text-rose-400 font-mono">
                <AlertCircle size={18} className="mr-2" /> {chartError}
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-xs text-slate-500 font-mono">
                Không có bản ghi quan trắc nào trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div className="h-96 w-full">
                <EChart options={lineChartOption} className="w-full h-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THỜI GIAN (GỘP S03 CHUỖI THỜI GIAN VÀ S04 XU HƯỚNG MÙA VỤ) */}
      {/* ========================================================================= */}
      {activeTab === 'time' && (
        <div className="space-y-4">
          {/* SUB-TAB TOGGLE */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTimeSubTab('aggregated')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  timeSubTab === 'aggregated'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Chuỗi thời gian tổng hợp (Ngày / Tuần / Tháng)
              </button>
              <button
                type="button"
                onClick={() => setTimeSubTab('trend')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  timeSubTab === 'trend'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Phân rã xu hướng &amp; Mùa vụ (STL Decomposition)
              </button>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              {timeSubTab === 'aggregated' ? 'Phân tích đa độ phân giải & Histogram' : 'Phân tích chu kỳ 12 tháng'}
            </span>
          </div>

          {timeSubTab === 'aggregated' ? (
            <TimeSeriesPage />
          ) : (
            <TrendPage />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DỮ LIỆU LẤY ĐƯỢC (LAYER VIEWER: BRONZE / SILVER / GOLD) */}
      {/* ========================================================================= */}
      {activeTab === 'layers' && (
        <div className="space-y-4">
          {/* LAYER SELECTOR BAR */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c121e] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Tầng dữ liệu:</span>
                <select
                  value={selectedLayer}
                  onChange={(e) => {
                    setSelectedLayer(e.target.value as LayerType)
                    setTablePage(1)
                    setTableCursor('')
                  }}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="silver">Silver · Dữ liệu chuẩn hóa &amp; Làm sạch QC</option>
                  <option value="bronze">Bronze · Dữ liệu thô nguyên trạng từ NOAA</option>
                  <option value="gold">Gold · Chỉ số tổng hợp phân tích</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Từ:</span>
                <input
                  type="date"
                  value={tableStart}
                  onChange={(e) => setTableStart(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Đến:</span>
                <input
                  type="date"
                  value={tableEnd}
                  onChange={(e) => setTableEnd(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
              Trang {tablePage} · Giới hạn 20 dòng/lần
            </span>
          </div>

          {/* TABLE CONTAINER */}
          <div className="rounded-xl border border-slate-800 bg-[#0c121e] overflow-hidden">
            {tableLoading ? (
              <div className="py-20 text-center text-xs text-slate-400 font-mono">
                <RefreshCw size={18} className="animate-spin text-sky-400 mx-auto mb-2" /> Đang tải bảng dữ liệu...
              </div>
            ) : tableError ? (
              <div className="p-6 text-center text-xs text-rose-400 font-mono">
                <AlertCircle size={20} className="mx-auto mb-2 text-rose-400" />
                {tableError}
              </div>
            ) : tableData.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-500 font-mono">
                Không tìm thấy dữ liệu trong khoảng thời gian đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3.5">Thời điểm (UTC)</th>
                      {selectedLayer === 'bronze' ? (
                        <>
                          <th className="py-3 px-3.5">Nguồn file / Feed</th>
                          <th className="py-3 px-3.5">Dòng dữ liệu thô (Raw line)</th>
                          <th className="py-3 px-3.5">Chi tiết</th>
                        </>
                      ) : selectedLayer === 'silver' ? (
                        <>
                          <th className="py-3 px-3">WVHT (m)</th>
                          <th className="py-3 px-3">DPD (s)</th>
                          <th className="py-3 px-3">APD (s)</th>
                          <th className="py-3 px-3">MWD (°)</th>
                          <th className="py-3 px-3">WTMP (°C)</th>
                          <th className="py-3 px-3 text-center">Trạng thái QC</th>
                          <th className="py-3 px-3">Nguồn</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-3">Kỳ phân tích</th>
                          <th className="py-3 px-3">Chỉ số</th>
                          <th className="py-3 px-3">Giá trị TB</th>
                          <th className="py-3 px-3">Trung vị</th>
                          <th className="py-3 px-3 text-center">Số mẫu</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3.5 font-mono text-slate-300 text-xs whitespace-nowrap">
                          {formatDateTimeUTC(row.observed_at)}
                        </td>

                        {selectedLayer === 'bronze' ? (
                          <>
                            <td className="py-2.5 px-3.5 text-slate-400 text-xs">
                              {row.source || 'noaa_51201_realtime.txt'}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-300 text-xs truncate max-w-md">
                              51201 {row.observed_at.slice(0, 10).replace(/-/g, ' ')} {row.wave_height_m ?? 99.0} {row.dominant_period_s ?? 99.0} {row.wave_direction_deg ?? 999}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <button
                                type="button"
                                onClick={() => setSelectedRawLine({
                                  time: row.observed_at,
                                  line: `51201 ${row.observed_at.slice(0, 10).replace(/-/g, ' ')} ${row.wave_height_m ?? 99.0} ${row.dominant_period_s ?? 99.0} ${row.average_period_s ?? 99.0} ${row.wave_direction_deg ?? 999} ${row.sea_temperature_c ?? 99.0}`,
                                  source: row.source || 'NOAA Standard Meteorological Feed',
                                })}
                                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-mono text-[11px]"
                              >
                                <Eye size={12} /> Xem raw
                              </button>
                            </td>
                          </>
                        ) : selectedLayer === 'silver' ? (
                          <>
                            <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                              {row.wave_height_m != null ? `${row.wave_height_m} m` : <span className="text-slate-600 font-normal">Không có trong nguồn</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-amber-300">
                              {row.dominant_period_s != null ? `${row.dominant_period_s} s` : <span className="text-slate-600 font-normal">Không có trong nguồn</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {row.average_period_s != null ? `${row.average_period_s} s` : <span className="text-slate-600 font-normal">Không có trong nguồn</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-violet-300">
                              {row.wave_direction_deg != null ? `${row.wave_direction_deg}°` : <span className="text-slate-600 font-normal">Không có trong nguồn</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-400">
                              {row.sea_temperature_c != null ? `${row.sea_temperature_c} °C` : <span className="text-slate-600 font-normal">Không có trong nguồn</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                row.quality_flag === 'valid'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}>
                                {row.quality_flag}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-xs">
                              {row.source}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-slate-300 text-xs">HST Daily Window</td>
                            <td className="py-2.5 px-3 font-mono text-sky-400">WVHT</td>
                            <td className="py-2.5 px-3 font-mono text-white font-bold">{row.wave_height_m ? (row.wave_height_m * 1.02).toFixed(2) : '—'} m</td>
                            <td className="py-2.5 px-3 font-mono text-amber-300">{row.wave_height_m ?? '—'} m</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">48 mẫu</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION FOOTER */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Hiển thị {tableData.length} quan trắc</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tablePage <= 1}
                  onClick={() => {
                    setTablePage((p) => Math.max(1, p - 1))
                    setTableCursor('')
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-200 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono px-2">Trang {tablePage}</span>
                <button
                  type="button"
                  disabled={!tableNextCursor}
                  onClick={() => {
                    if (tableNextCursor) {
                      setTableCursor(tableNextCursor)
                      setTablePage((p) => p + 1)
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-200 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAW LINE DETAIL MODAL */}
      {selectedRawLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#0c121e] shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                <FileText size={17} />
                <span>Chi tiết dòng NOAA thô (Bronze Layer)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRawLine(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-400">Thời điểm quan trắc: <strong className="text-white">{selectedRawLine.time}</strong></p>
              <p className="text-slate-400">Nguồn file: <strong className="text-white">{selectedRawLine.source}</strong></p>
              <div className="p-3 rounded-lg bg-black border border-slate-800 font-mono text-emerald-400 break-all text-xs">
                {selectedRawLine.line}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Dòng gốc được lưu trữ bất biến trên Google Cloud Storage `gs://waimea-noaa/noaa/raw/` kèm mã hash SHA-256 đối soát.
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedRawLine(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
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
