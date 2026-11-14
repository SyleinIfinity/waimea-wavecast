import { useEffect, useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { Activity, BarChart3, CalendarDays, ChartScatter, RefreshCw, Waves } from 'lucide-react'
import EChart from '../../components/charts/EChart'
import { loadTimeSeries, type WaveObservation } from './data'

type Metric = 'WVHT' | 'DPD' | 'APD' | 'MWD' | 'WTMP'
type Aggregation = 'mean' | 'median'
const fields: Record<Metric, { field: keyof WaveObservation; unit: string; title: string }> = {
  WVHT: { field: 'wave_height_m', unit: 'm', title: 'Wave Height' },
  DPD: { field: 'dominant_period_s', unit: 's', title: 'Dominant Period' },
  APD: { field: 'average_period_s', unit: 's', title: 'Average Period' },
  MWD: { field: 'wave_direction_deg', unit: '°', title: 'Wave Direction' },
  WTMP: { field: 'sea_temperature_c', unit: '°C', title: 'Sea Temperature' },
}
function dateUTC(daysBack: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d.toISOString().slice(0, 10)
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
function getValue(row: WaveObservation, metric: Metric): number | null {
  const value = row[fields[metric].field]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
function aggregate(rows: WaveObservation[], metric: Metric, period: 'day' | 'week' | 'month', method: Aggregation) {
  const buckets = new Map<string, number[]>()
  for (const row of rows) {
    const n = getValue(row, metric)
    if (n === null) continue
    const day = new Date(row.observed_at)
    if (!Number.isFinite(day.getTime())) continue
    let label: string
    if (period === 'month') {
      label = day.toISOString().slice(0, 7)
    } else if (period === 'week') {
      // Tuần ISO bắt đầu thứ Hai, dùng ngày bắt đầu tuần làm nhãn.
      const monday = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()))
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
      label = monday.toISOString().slice(0, 10)
    } else {
      label = day.toISOString().slice(0, 10)
    }
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label)?.push(n)
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, values]) => ({
    label,
    value: Number((method === 'mean' ? values.reduce((a, b) => a + b, 0) / values.length : median(values)).toFixed(3)),
    count: values.length,
  }))
}
function lineOptions(
  rows: ReturnType<typeof aggregate>,
  label: string,
  unit: string,
  metric: Metric,
  showZoomSlider: boolean,
): EChartsOption {
  // Phóng to bằng cuộn chuột/touch luôn khả dụng; thanh zoom chỉ hiện khi người dùng yêu cầu.
  const zoom: EChartsOption['dataZoom'] = [{ type: 'inside', zoomOnMouseWheel: 'shift' }]
  if (showZoomSlider && rows.length > 8) {
    zoom.push({ type: 'slider', bottom: 6, height: 15, borderColor: '#31556b' })
  }
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', valueFormatter: value => `${value} ${unit}` },
    grid: { top: 22, left: 54, right: 16, bottom: showZoomSlider && rows.length > 8 ? 52 : 30 },
    xAxis: {
      type: 'category', data: rows.map(x => x.label),
      axisLabel: { color: '#9fbace', hideOverlap: true },
      axisLine: { lineStyle: { color: '#31556b' } },
    },
    yAxis: {
      type: 'value', name: unit, nameTextStyle: { color: '#9fbace' },
      axisLabel: { color: '#9fbace' }, splitLine: { lineStyle: { color: '#244459' } },
      min: metric === 'MWD' ? 0 : undefined, max: metric === 'MWD' ? 360 : undefined,
    },
    dataZoom: zoom,
    series: [{
      name: label, type: 'line', smooth: metric !== 'MWD',
      showSymbol: rows.length <= 20, symbolSize: 7,
      itemStyle: { color: '#22d3ee' }, lineStyle: { width: 2.5 },
      areaStyle: metric === 'MWD' ? undefined : { opacity: 0.12 },
      data: rows.map(x => x.value),
    }],
  }
}
const fieldStyle = 'rounded-xl border border-[#31556b] bg-[#081d30] px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-400'
const panel = 'rounded-2xl border border-[#264b63] bg-[#10283c] p-5'

export default function TimeSeriesPage() {
  const [from, setFrom] = useState(() => dateUTC(180))
  const [to, setTo] = useState(() => dateUTC(0))
  const [metric, setMetric] = useState<Metric>('WVHT')
  const [aggregation, setAggregation] = useState<Aggregation>('mean')
  const [qcOnly, setQcOnly] = useState(false)
  const [showZoomSlider, setShowZoomSlider] = useState(false)
  const [quickRange, setQuickRange] = useState<number | null>(180)
  const [applied, setApplied] = useState(() => ({ from: dateUTC(180), to: dateUTC(0) }))
  const [refresh, setRefresh] = useState(0)
  const [rows, setRows] = useState<WaveObservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    loadTimeSeries(applied.from, applied.to, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        setRows(result.items)
        setTruncated(result.truncated)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setRows([])
        setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [applied, refresh])

  const filtered = useMemo(() => qcOnly ? rows.filter(x => x.quality_flag.toLowerCase() === 'valid') : rows, [rows, qcOnly])
  const daily = useMemo(() => aggregate(filtered, metric, 'day', aggregation), [filtered, metric, aggregation])
  const weekly = useMemo(() => aggregate(filtered, metric, 'week', aggregation), [filtered, metric, aggregation])
  const monthly = useMemo(() => aggregate(filtered, metric, 'month', aggregation), [filtered, metric, aggregation])
  const heights = useMemo(() => filtered.map(x => x.wave_height_m).filter((x): x is number => typeof x === 'number' && Number.isFinite(x)), [filtered])
  const pairs = useMemo(() => filtered.filter(x => typeof x.wave_height_m === 'number' && typeof x.dominant_period_s === 'number').map(x => [x.wave_height_m as number, x.dominant_period_s as number]), [filtered])

  const histogram: EChartsOption = useMemo(() => {
    const edges = Array.from({ length: 12 }, (_, index) => index * 0.5)
    const counts = edges.map((min, index) => heights.filter(v => v >= min && (index === 11 ? true : v < min + 0.5)).length)
    return {
      backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
      grid: { left: 55, right: 18, top: 25, bottom: 45 },
      xAxis: { type: 'category', name: 'WVHT (m)', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: '#9fbace' }, data: edges.map((v, i) => i === 11 ? '≥5.5' : `${v}–${v + 0.5}`), axisLabel: { color: '#9fbace', interval: 1, rotate: 35 } },
      yAxis: { type: 'value', name: 'Số mẫu', nameTextStyle: { color: '#9fbace' }, axisLabel: { color: '#9fbace' }, splitLine: { lineStyle: { color: '#244459' } } },
      series: [{ name: 'Observations', type: 'bar', data: counts, barMaxWidth: 34, itemStyle: { color: '#22d3ee', borderRadius: [4, 4, 0, 0] } }],
    }
  }, [heights])

  const scatter: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent', tooltip: { trigger: 'item', formatter: (p: unknown) => {
      const record = p as { value?: number[] }
      return record.value ? `WVHT: ${record.value[0]} m<br/>DPD: ${record.value[1]} s` : ''
    } },
    grid: { left: 55, right: 22, top: 24, bottom: 48 },
    xAxis: { type: 'value', name: 'WVHT (m)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#9fbace' }, axisLabel: { color: '#9fbace' }, splitLine: { lineStyle: { color: '#244459' } } },
    yAxis: { type: 'value', name: 'DPD (s)', nameTextStyle: { color: '#9fbace' }, axisLabel: { color: '#9fbace' }, splitLine: { lineStyle: { color: '#244459' } } },
    series: [{ name: 'WVHT–DPD', type: 'scatter', data: pairs, symbolSize: 7, itemStyle: { color: '#49c5ef', opacity: 0.6 } }],
  }), [pairs])

  function apply() {
    if (!from || !to || from > to) {
      setError('Khoảng thời gian không hợp lệ: ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
      return
    }
    setError(null)
    setApplied({ from, to })
    setRefresh(n => n + 1)
  }
  function selectQuickRange(days: number) {
    const next = { from: dateUTC(days), to: dateUTC(0) }
    setFrom(next.from)
    setTo(next.to)
    setQuickRange(days)
    setApplied(next)
    setError(null)
  }
  function resetFilters() {
    const next = { from: dateUTC(180), to: dateUTC(0) }
    setFrom(next.from)
    setTo(next.to)
    setQuickRange(180)
    setMetric('WVHT')
    setAggregation('mean')
    setQcOnly(false)
    setShowZoomSlider(false)
    setApplied(next)
    setError(null)
    setRefresh(n => n + 1)
  }
  const active = fields[metric]
  const metricValues = filtered.map(x => getValue(x, metric)).filter((x): x is number => x !== null)
  const average = metricValues.length ? metricValues.reduce((a, b) => a + b, 0) / metricValues.length : null
  const observedData = !loading && !error && rows.length > 0
  const metricSummary = metricValues.length ? (aggregation === 'mean' ? average : median(metricValues)) : null
  const miniStat = (label: string, value: string) => <div className="rounded-xl border border-[#294c63] bg-[#0a2133] p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-2 text-xl font-bold text-white">{value}</div></div>
  const section = (title: string, description: string, data: ReturnType<typeof aggregate>, allowZoom = false) => (
    <section className={panel}>
      <div className="mb-4"><h2 className="text-base font-bold text-white">{title}</h2><p className="mt-1 text-xs text-slate-400">{description} · {aggregation.toUpperCase()} · {active.unit}</p></div>
      {data.length > 0 ? (
        <EChart options={lineOptions(data, active.title, active.unit, metric, allowZoom && showZoomSlider)} height={244} />
      ) : <EmptyChart />}
      {data.length === 1 && <p className="mt-1 text-xs text-amber-300">Chỉ có một mốc thời gian trong khoảng lọc.</p>}
    </section>
  )

  return <div className="min-w-0 space-y-6 text-slate-100">
    <header className="rounded-2xl border border-[#28516a] bg-[#102d43] p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400"><Waves size={17} /> S03 · NOAA Station 51201</div>
      <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Time-Series Analytics</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Phân tích sóng biển theo ngày, tuần và tháng; phân bố độ cao sóng và mối quan hệ WVHT–DPD.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">Station 51201 · UTC aggregation</span><span className={`rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-300`}>{loading ? 'LOADING' : error ? 'DATA UNAVAILABLE' : 'BACKEND DATA'}</span></div>
    </header>

    <section className={panel}>
      <h2 className="mb-4 flex items-center gap-2 font-bold text-white"><CalendarDays size={18} className="text-cyan-400" /> Bộ lọc phân tích</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2 text-xs text-slate-400">Từ ngày (UTC)<input className={fieldStyle} type="date" value={from} onChange={e => { setFrom(e.target.value); setQuickRange(null) }} /></label>
        <label className="flex flex-col gap-2 text-xs text-slate-400">Đến ngày (UTC)<input className={fieldStyle} type="date" value={to} onChange={e => { setTo(e.target.value); setQuickRange(null) }} /></label>
        <label className="flex flex-col gap-2 text-xs text-slate-400">Chỉ số<select className={fieldStyle} value={metric} onChange={e => setMetric(e.target.value as Metric)}>{Object.entries(fields).map(([key, item]) => <option key={key} value={key}>{key} · {item.title}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-xs text-slate-400">Phương pháp<select className={fieldStyle} value={aggregation} onChange={e => setAggregation(e.target.value as Aggregation)}><option value="mean">Mean · Trung bình</option><option value="median">Median · Trung vị</option></select></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Khoảng thời gian nhanh">
        <span className="mr-1 text-xs text-slate-400">Khoảng nhanh:</span>
        {([30, 90, 180, 239] as const).map(days => (
          <button key={days} type="button" onClick={() => selectQuickRange(days)}
            aria-pressed={quickRange === days}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${quickRange === days ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200' : 'border-[#31556b] text-slate-300 hover:bg-[#193b51]'}`}>
            {days === 239 ? 'Toàn bộ demo' : `${days} ngày`}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={apply} disabled={loading} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#062235] hover:bg-cyan-400 disabled:opacity-40">Áp dụng</button>
        <button type="button" onClick={resetFilters} className="rounded-xl border border-[#31556b] px-4 py-2.5 text-sm hover:bg-[#193b51]">Đặt lại</button>
        <button type="button" disabled={loading} onClick={() => setRefresh(n => n + 1)} className="flex items-center gap-2 rounded-xl border border-[#31556b] px-4 py-2.5 text-sm disabled:opacity-40"><RefreshCw size={15} /> Làm mới</button>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-cyan-400" checked={qcOnly} onChange={e => setQcOnly(e.target.checked)} /> Chỉ QC valid</label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-cyan-400" checked={showZoomSlider} onChange={e => setShowZoomSlider(e.target.checked)} /> Hiện thanh zoom Daily</label>
      </div>
      <p className="mt-3 text-xs text-slate-400">Chỉ số, Mean/Median và QC cập nhật biểu đồ ngay; thay ngày thủ công rồi nhấn Áp dụng. Chọn khoảng nhanh để áp dụng ngay.</p>
    </section>

    {error && <div role="alert" className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-200">Không thể tải dữ liệu: {error}</div>}
    {truncated && <div className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-200">Backend có nhiều hơn 10 trang dữ liệu. Biểu đồ chỉ dựa trên phần dữ liệu đã tải; cần API tổng hợp để hiển thị toàn bộ lịch sử.</div>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {miniStat('Bản ghi đã tải', observedData ? filtered.length.toLocaleString('vi-VN') : '—')}
      {miniStat(`Giá trị ${metric} hợp lệ`, observedData ? metricValues.length.toLocaleString('vi-VN') : '—')}
      {miniStat(`${metric} ${aggregation === 'mean' ? 'trung bình' : 'trung vị'}`, metricSummary === null || !observedData ? '—' : `${metricSummary.toFixed(2)} ${active.unit}`)}
      {miniStat('Số ngày có dữ liệu', observedData ? `${new Set(filtered.map(x => x.observed_at.slice(0, 10))).size}` : '—')}
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      {section('Daily Overview', 'Giá trị gộp theo từng ngày UTC', daily, true)}
      {section('Weekly Overview', 'Giá trị gộp theo tuần UTC (bắt đầu thứ Hai)', weekly)}
    </div>
    {section('Monthly Overview', 'Giá trị gộp theo từng tháng UTC', monthly)}

    <div className="grid gap-5 xl:grid-cols-2">
      <section className={panel}><div className="mb-4 flex items-center gap-2"><BarChart3 className="text-cyan-400" size={18} /><h2 className="font-bold text-white">Wave Height Distribution</h2></div><p className="mb-4 text-xs text-slate-400">Histogram WVHT · bước 0,5 m · {heights.length} mẫu hợp lệ</p>{heights.length ? <EChart options={histogram} height={315} /> : <EmptyChart />}</section>
      <section className={panel}><div className="mb-4 flex items-center gap-2"><ChartScatter className="text-cyan-400" size={18} /><h2 className="font-bold text-white">Wave Height vs Dominant Period</h2></div><p className="mb-4 text-xs text-slate-400">Scatter WVHT (m) và DPD (s) · {pairs.length} cặp hợp lệ</p>{pairs.length ? <EChart options={scatter} height={315} /> : <EmptyChart />}</section>
    </div>
    <p className="text-xs leading-5 text-slate-500">Các biểu đồ được tính từ dữ liệu quan trắc tải về trong khoảng ngày chọn. Với MWD (góc), trung bình và trung vị tuyến tính chỉ phục vụ minh họa; cần thống kê vòng tròn để phân tích hướng chính xác. Các giá trị null không được tính vào tổng hợp.</p>
  </div>
}

function EmptyChart() {
  return <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#31556b] bg-[#091f30] px-4 text-center"><Activity className="mb-3 text-cyan-400/60" size={27} /><p className="font-semibold text-slate-200">Chưa đủ dữ liệu để hiển thị biểu đồ</p><p className="mt-2 text-xs text-slate-400">Thử khoảng thời gian rộng hơn hoặc kiểm tra kết nối Backend.</p></div>
}
