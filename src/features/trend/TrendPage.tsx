import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import {
  Activity, CalendarRange, ChartNoAxesCombined, ChevronLeft, ChevronRight,
  Download, FileImage, Info, LayoutGrid, List, RefreshCw, Table2, Waves,
} from 'lucide-react'
import { defaultTrendMonths, loadTrend, type TrendPoint } from './data'

type Metric = 'WVHT' | 'DPD' | 'WTMP'
type ComponentKey = 'observed' | 'trend' | 'seasonal' | 'residual'
type View = 'grid' | 'stacked'
const PAGE_SIZE = 12
const meta: Record<Metric, { title: string; unit: string }> = {
  WVHT: { title: 'Wave Height', unit: 'm' },
  DPD: { title: 'Dominant Period', unit: 's' },
  WTMP: { title: 'Sea Temperature', unit: '°C' },
}
const components: { key: ComponentKey; label: string; description: string; color: string }[] = [
  { key: 'observed', label: 'Observed', description: 'Giá trị lịch sử theo tháng', color: '#25d0f0' },
  { key: 'trend', label: 'Trend', description: 'Xu hướng lịch sử · không phải dự báo', color: '#54a4ff' },
  { key: 'seasonal', label: 'Seasonal', description: 'Thành phần mùa vụ chu kỳ 12 tháng', color: '#b8a1ff' },
  { key: 'residual', label: 'Residual', description: 'Observed − Trend − Seasonal', color: '#f5b868' },
]
const panel = 'rounded-2xl border border-[#264b63] bg-[#10283c] p-5'
const fieldStyle = 'w-full rounded-xl border border-[#31556b] bg-[#081d30] px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none'
const defaultRange = defaultTrendMonths()

function monthLabel(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value
  return `${value.slice(5, 7)}/${value.slice(0, 4)}`
}
function parseMonth(value: string) {
  const clean = value.trim()
  const match = /^(0?[1-9]|1[0-2])\/(\d{4})$/.exec(clean)
  if (!match) return null
  return `${match[2]}-${match[1].padStart(2, '0')}`
}
function shiftMonths(amount: number) {
  const d = new Date()
  const begin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  const from = new Date(begin)
  from.setUTCMonth(from.getUTCMonth() - amount)
  const to = new Date(begin)
  to.setUTCMonth(to.getUTCMonth() - 1)
  return { from: from.toISOString().slice(0, 7), to: to.toISOString().slice(0, 7) }
}
function formatValue(n: number | null | undefined, unit?: string) {
  if (n === null || n === undefined) return '—'
  return `${n.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ''}`
}
function chartOption(key: ComponentKey, rows: TrendPoint[], metric: Metric, zoom: [number, number]): EChartsOption {
  const spec = components.find(p => p.key === key)!
  const unit = meta[metric].unit
  const deviation = key === 'seasonal' || key === 'residual'
  return {
    backgroundColor: 'transparent', animationDuration: 250,
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross', snap: true },
      backgroundColor: '#0a2132', borderColor: '#31556b', textStyle: { color: '#e6f3ff' },
      valueFormatter: (value: unknown) => value == null ? 'N/A' : formatValue(Number(value), unit),
    },
    grid: { left: 62, right: 22, top: 30, bottom: 43 },
    xAxis: {
      type: 'category', data: rows.map(r => r.period), boundaryGap: false,
      axisLabel: { color: '#a2bfd1', hideOverlap: true }, axisLine: { lineStyle: { color: '#31556b' } },
      axisPointer: { show: true, snap: true },
    },
    yAxis: {
      type: 'value', name: unit, scale: true, nameTextStyle: { color: '#a2bfd1' },
      axisLabel: { color: '#a2bfd1' }, splitLine: { lineStyle: { color: '#244459' } },
    },
    dataZoom: [{ type: 'inside', start: zoom[0], end: zoom[1], zoomOnMouseWheel: false, moveOnMouseMove: false, moveOnMouseWheel: false }],
    series: [{
      name: spec.label, type: 'line', smooth: key !== 'residual', connectNulls: false,
      showSymbol: rows.length <= 18, symbolSize: 6,
      lineStyle: { width: 2.5, color: spec.color }, itemStyle: { color: spec.color },
      areaStyle: deviation ? undefined : { color: spec.color, opacity: 0.07 },
      markLine: deviation ? {
        silent: true, symbol: 'none', lineStyle: { color: '#748fa4', type: 'dashed', opacity: 0.6 },
        label: { show: false }, data: [{ yAxis: 0 }],
      } : undefined,
      data: rows.map(r => r[key]),
    }],
  }
}

// Đồng bộ tooltip bằng ECharts group, không chỉnh component EChart dùng chung của TL03.
function SyncedChart({ option, group, height }: { option: EChartsOption; group: string; height: number }) {
  const element = useRef<HTMLDivElement>(null)
  const instance = useRef<echarts.ECharts | null>(null)
  useEffect(() => {
    if (!element.current) return
    const chart = echarts.init(element.current, 'dark', { renderer: 'svg' })
    instance.current = chart
    chart.group = group
    echarts.connect(group)
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(element.current)
    return () => {
      observer.disconnect()
      chart.dispose()
      instance.current = null
    }
  }, [group])
  useEffect(() => { instance.current?.setOption(option, { notMerge: true }) }, [option])
  return <div ref={element} style={{ width: '100%', height }} role="img" aria-label="Biểu đồ phân rã chuỗi thời gian" />
}

function csvValue(value: unknown) {
  if (typeof value === 'number') return String(value)
  const raw = value == null ? '' : String(value)
  const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}
function saveText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function TrendPage() {
  const reactId = useId().replace(/[^\w-]/g, '')
  const group = `s04-linked-${reactId}`
  const [fromText, setFromText] = useState(monthLabel(defaultRange.from))
  const [toText, setToText] = useState(monthLabel(defaultRange.to))
  const [metric, setMetric] = useState<Metric>('WVHT')
  const [applied, setApplied] = useState({ ...defaultRange, metric: 'WVHT' as Metric })
  const [showResidual, setShowResidual] = useState(true)
  const [showMethod, setShowMethod] = useState(false)
  const [view, setView] = useState<View>('grid')
  const [zoom, setZoom] = useState<[number, number]>([0, 100])
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrendPoint[]>([])
  const [isMock, setIsMock] = useState(false)
  const [method, setMethod] = useState('')
  const [period, setPeriod] = useState(12)
  const [note, setNote] = useState('')
  const [exportBusy, setExportBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null); setData([])
    loadTrend(applied, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setData(result.items); setIsMock(result.isMock)
      setMethod(result.method); setPeriod(result.seasonalPeriod); setNote(result.note)
      setZoom([0, 100]); setPage(1)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [applied, refresh])

  const sufficient = data.some(r => r.trend !== null && r.seasonal !== null && r.residual !== null)
  const options = useMemo(() => ({
    observed: chartOption('observed', data, applied.metric, zoom),
    trend: chartOption('trend', data, applied.metric, zoom),
    seasonal: chartOption('seasonal', data, applied.metric, zoom),
    residual: chartOption('residual', data, applied.metric, zoom),
  }), [data, applied.metric, zoom])
  const displayed = components.filter(p => p.key !== 'residual' || showResidual)
  const validTrend = data.filter(r => r.trend !== null).length
  const observed = data.map(r => r.observed).filter((v): v is number => typeof v === 'number')
  const average = observed.length ? observed.reduce((a, b) => a + b, 0) / observed.length : null
  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const currentRows = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const completePoints = data.filter(r => r.trend !== null && r.seasonal !== null && r.residual !== null).length

  function apply() {
    const from = parseMonth(fromText)
    const to = parseMonth(toText)
    if (!from || !to) { setError('Tháng phải có định dạng MM/YYYY, ví dụ 11/2023.'); return }
    if (from > to) { setError('Tháng bắt đầu phải nhỏ hơn hoặc bằng tháng kết thúc.'); return }
    setError(null); setFromText(monthLabel(from)); setToText(monthLabel(to))
    setApplied({ from, to, metric }); setRefresh(v => v + 1)
  }
  function quickRange(months: number) {
    const range = shiftMonths(months)
    setFromText(monthLabel(range.from)); setToText(monthLabel(range.to))
    setApplied({ ...range, metric }); setRefresh(v => v + 1)
  }
  function reset() {
    setFromText(monthLabel(defaultRange.from)); setToText(monthLabel(defaultRange.to)); setMetric('WVHT')
    setShowResidual(true); setZoom([0, 100]); setShowMethod(false); setPage(1); setView('grid')
    setApplied({ ...defaultRange, metric: 'WVHT' }); setRefresh(v => v + 1)
  }
  function exportCSV() {
    if (!sufficient || loading) return
    const headers = ['STT', 'Month (UTC)', 'Observed', 'Trend', 'Seasonal', 'Residual', 'Unit', 'Data Mode']
    const lines = data.map((r, i) => [i + 1, r.period, r.observed, r.trend, r.seasonal, r.residual, meta[applied.metric].unit, isMock ? 'MOCK DATA - NOT NOAA' : 'BACKEND'].map(csvValue).join(','))
    saveText(`waimea-s04-${applied.metric}-${applied.from}-${applied.to}.csv`, [headers.join(','), ...lines].join('\r\n'))
  }

  async function exportPNG() {
    if (!sufficient || loading || exportBusy) return
    setExportBusy(true)
    const width = 1440
    const height = 170 + displayed.length * 270 + 60
    const host = document.createElement('div')
    host.style.cssText = `position:fixed;left:-16000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`
    document.body.appendChild(host)
    const chart = echarts.init(host, undefined, { renderer: 'canvas', width, height })
    try {
      const exportOptions: EChartsOption = {
        animation: false,
        backgroundColor: '#0a2032',
        title: {
          text: `Waimea WaveCast · S04 | ${applied.metric} | ${applied.from} → ${applied.to}`,
          subtext: `${isMock ? 'MOCK DATA · NOT NOAA' : 'BACKEND DATA'}  |  ${method}  |  Period: ${period} months`,
          left: 62, top: 18,
          textStyle: { color: '#e6f3ff', fontSize: 24 },
          subtextStyle: { color: '#afc4d3', fontSize: 13 },
        },
        legend: { show: true, top: 92, textStyle: { color: '#d2e6f1' }, data: displayed.map(p => p.label) },
        grid: displayed.map((_, i) => ({ left: 104, right: 70, top: 150 + i * 270, height: 192 })),
        xAxis: displayed.map((_, i) => ({
          type: 'category' as const, gridIndex: i, boundaryGap: false,
          data: data.map(r => r.period),
          axisLabel: { color: '#a3c1d1', hideOverlap: true }, axisLine: { lineStyle: { color: '#31556b' } },
        })),
        yAxis: displayed.map((p, i) => ({
          type: 'value' as const, gridIndex: i, name: `${p.label} (${meta[applied.metric].unit})`,
          nameTextStyle: { color: '#a3c1d1' }, axisLabel: { color: '#a3c1d1' },
          splitLine: { lineStyle: { color: '#244459' } },
        })),
        series: displayed.map((p, i) => ({
          name: p.label, type: 'line' as const, xAxisIndex: i, yAxisIndex: i,
          data: data.map(r => r[p.key]),
          showSymbol: false, connectNulls: false, smooth: p.key !== 'residual',
          lineStyle: { color: p.color, width: 3 }, itemStyle: { color: p.color },
          areaStyle: (p.key === 'observed' || p.key === 'trend') ? { color: p.color, opacity: 0.07 } : undefined,
        })),
        graphic: [{ type: 'text', left: 104, bottom: 28, style: {
          text: `Export: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${data.length} monthly records · ${isMock ? 'SIMULATED DATA' : 'BACKEND DATA'}`,
          fill: '#b0c6d5', font: '14px sans-serif',
        } }],
      }
      chart.setOption(exportOptions, { notMerge: true, lazyUpdate: false })
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      chart.getZr().flush()
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0a2032' })
      const a = document.createElement('a')
      a.href = url; a.download = `waimea-s04-${applied.metric}-${applied.from}-${applied.to}.png`
      document.body.appendChild(a); a.click(); a.remove()
    } catch (err) {
      setError(err instanceof Error ? `Lỗi xuất PNG: ${err.message}` : 'Lỗi xuất PNG không xác định')
    } finally {
      chart.dispose(); host.remove(); setExportBusy(false)
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 text-slate-100">
      <section className={panel + ' bg-[#102d43]'}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400"><Waves size={16}/> S04 · NOAA Station 51201</div>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Trend & Seasonality</h1>
        <p className="mt-2 text-sm text-[#9bb8cd]">Phân rã chuỗi thời gian: quan trắc, xu hướng, mùa vụ và phần dư. Không phải dự báo tương lai.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-cyan-500/10 px-3 py-1.5 text-cyan-300">Station 51201 · Monthly</span>
          <span className={`rounded-md px-3 py-1.5 font-bold ${isMock ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{loading ? 'LOADING...' : error ? 'NO DATA / ERROR' : isMock ? 'MOCK DATA · NOT NOAA' : 'BACKEND DATA'}</span>
        </div>
      </section>

      <section className={panel}>
        <div className="mb-5 flex items-center gap-2 font-bold"><CalendarRange size={18} className="text-cyan-400"/> Bộ lọc phân rã</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-xs text-slate-400">Từ tháng (UTC)<input className={fieldStyle} type="text" inputMode="numeric" placeholder="MM/YYYY" value={fromText} onChange={e => setFromText(e.target.value)} aria-label="Từ tháng MM/YYYY" /></label>
          <label className="space-y-2 text-xs text-slate-400">Đến tháng (UTC)<input className={fieldStyle} type="text" inputMode="numeric" placeholder="MM/YYYY" value={toText} onChange={e => setToText(e.target.value)} aria-label="Đến tháng MM/YYYY" /></label>
          <label className="space-y-2 text-xs text-slate-400">Chỉ số<select className={fieldStyle} value={metric} onChange={e => setMetric(e.target.value as Metric)}>{Object.entries(meta).map(([k, m]) => <option key={k} value={k}>{k} · {m.title}</option>)}</select></label>
          <label className="space-y-2 text-xs text-slate-400">Granularity<select className={fieldStyle} value="month" disabled><option value="month">Monthly · 12-month cycle</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="mr-1 text-[#9bb8cd]">Khoảng nhanh:</span>
          {[24, 36, 48].map(n => <button type="button" key={n} onClick={() => quickRange(n)} className="rounded-lg border border-[#31556b] px-3 py-2 hover:border-cyan-400 hover:text-cyan-300">{n} tháng</button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={apply} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#062235] hover:bg-cyan-400">Áp dụng</button>
          <button type="button" onClick={reset} className="rounded-xl border border-[#31556b] px-4 py-2.5 text-sm hover:bg-[#193b51]">Đặt lại</button>
          <button type="button" onClick={() => setRefresh(v => v + 1)} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#31556b] px-4 py-2.5 text-sm hover:bg-[#193b51] disabled:opacity-40"><RefreshCw size={15}/> Làm mới</button>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-cyan-400" checked={showResidual} onChange={e => setShowResidual(e.target.checked)}/> Hiện Residual</label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" onClick={exportCSV} disabled={!sufficient || loading} className="flex items-center gap-2 rounded-xl border border-[#31556b] px-3 py-2.5 text-sm text-cyan-300 hover:bg-[#193b51] disabled:opacity-30"><Download size={15}/> Xuất CSV</button>
            <button type="button" onClick={exportPNG} disabled={!sufficient || loading || exportBusy} className="flex items-center gap-2 rounded-xl border border-cyan-500/40 px-3 py-2.5 text-sm text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30"><FileImage size={15}/> {exportBusy ? 'Đang xuất...' : 'Xuất PNG'}</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Tháng nhập dạng MM/YYYY. Demo cần ít nhất 36 tháng liên tục để phân rã. Khoảng thời gian áp dụng theo tháng UTC.</p>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-[#09283b] p-3 text-xs leading-5 text-cyan-200"><Info size={16} className="mt-0.5 shrink-0"/> {error ? 'Backend lỗi sẽ không tự thay bằng mock. Kiểm tra bộ lọc hoặc kết nối.' : isMock ? 'MOCK DATA · Tất cả giá trị và thành phần phân rã chỉ để kiểm thử Frontend, không phải số liệu NOAA.' : 'Chế độ Backend: dữ liệu dự kiến từ endpoint trend-seasonal.'}</div>
      {error && <div role="alert" className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200"><strong>Thông báo S04:</strong> {error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Số tháng', data.length ? String(data.length) : '—'],
          ['Xu hướng khả dụng', validTrend ? `${validTrend} tháng` : '—'],
          [`Observed TB (${meta[applied.metric].unit})`, average == null ? '—' : formatValue(average)],
          ['Seasonal period', data.length ? `${period} tháng` : '—'],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#264b63] bg-[#0c2437] p-4"><div className="text-xs text-[#9bb8cd]">{label}</div><div className="mt-2 text-xl font-bold text-white">{value}</div></div>)}
      </div>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold"><ChartNoAxesCombined size={18} className="text-cyan-400"/> Synchronized Time Window</div>
          <button type="button" onClick={() => setZoom([0, 100])} className="rounded-lg border border-[#31556b] px-3 py-2 text-xs hover:bg-[#193b51]">Đặt lại Zoom</button>
        </div>
        <p className="mb-3 mt-2 text-xs text-slate-400">Thanh Zoom bên dưới áp dụng cho tất cả biểu đồ. Tooltip và vị trí trục X đồng bộ giữa các khung.</p>
        <div className="flex items-center gap-3"><span className="w-14 text-xs text-slate-400">Bắt đầu</span><input aria-label="Bắt đầu zoom" type="range" min={0} max={95} value={zoom[0]} onChange={e => setZoom([Math.min(Number(e.target.value), zoom[1] - 5), zoom[1]])} className="min-w-0 flex-1 accent-cyan-400"/><span className="w-11 text-right text-xs text-cyan-300">{zoom[0]}%</span></div>
        <div className="mt-2 flex items-center gap-3"><span className="w-14 text-xs text-slate-400">Kết thúc</span><input aria-label="Kết thúc zoom" type="range" min={5} max={100} value={zoom[1]} onChange={e => setZoom([zoom[0], Math.max(Number(e.target.value), zoom[0] + 5)])} className="min-w-0 flex-1 accent-cyan-400"/><span className="w-11 text-right text-xs text-cyan-300">{zoom[1]}%</span></div>
      </section>

      {loading ? <div className="h-64 animate-pulse rounded-2xl bg-[#193b50]"/> : !sufficient ? (
        <section className={panel + ' py-16 text-center'}><Activity size={30} className="mx-auto mb-3 text-cyan-400"/><h2 className="font-bold">Chưa đủ dữ liệu để phân rã</h2><p className="mt-2 text-sm text-slate-400">Cần tối thiểu 36 tháng đầy đủ theo phương pháp demo. Không tự nối những tháng bị thiếu.</p></section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-bold text-white">Decomposition Charts</h2><p className="mt-1 text-xs text-slate-400">{view === 'grid' ? 'Grid 2 cột để xem tổng quan' : 'Stacked để đối chiếu theo cùng trục thời gian'}</p></div>
            <div className="flex gap-1 rounded-xl border border-[#31556b] bg-[#081d30] p-1">
              <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${view === 'grid' ? 'bg-cyan-500 text-[#062235] font-bold' : 'text-slate-300 hover:bg-[#16364b]'}`}><LayoutGrid size={14}/> Grid</button>
              <button type="button" aria-pressed={view === 'stacked'} onClick={() => setView('stacked')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${view === 'stacked' ? 'bg-cyan-500 text-[#062235] font-bold' : 'text-slate-300 hover:bg-[#16364b]'}`}><List size={14}/> Stacked</button>
            </div>
          </div>
          <div className={`grid gap-5 ${view === 'grid' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
            {displayed.map(p => <section key={p.key} className={panel}>
              <div className="mb-1 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }}/><h3 className="font-bold text-white">{p.label}</h3></div>
              <p className="mb-2 text-xs text-[#9bb8cd]">{p.description} · {meta[applied.metric].unit}</p>
              <SyncedChart option={options[p.key]} group={group} height={view === 'stacked' ? 210 : 235}/>
            </section>)}
          </div>
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">Dữ liệu thiếu ở biên là bình thường: centered 12-month moving average không thể tính Trend tại các tháng chưa đủ cửa sổ. Seasonal và Residual cũng để trống ở những tháng đó; không nội suy để lấp khoảng trống. Có {completePoints}/{data.length} tháng đủ cả bốn thành phần.</p>
        </>
      )}

      <section className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Table2 size={18} className="text-cyan-400"/><h2 className="font-bold">Decomposition Details</h2></div>
          <span className="text-xs text-slate-400">{data.length} tháng · {meta[applied.metric].unit} · {isMock ? 'Mock Data' : 'Backend'}</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#31556b]">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#081d30] text-[#9bb8cd] uppercase"><tr>
              {['STT', 'Month (UTC)', 'Observed', 'Trend', 'Seasonal', 'Residual'].map((h, i) => <th key={h} scope="col" className={`px-4 py-3 ${i === 0 ? 'sticky left-0 z-10 bg-[#081d30] text-center text-cyan-300' : ''}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                : currentRows.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Chưa có dữ liệu.</td></tr>
                  : currentRows.map((r, i) => <tr key={r.period} className="group border-t border-[#264b63] odd:bg-[#10283c] even:bg-[#0b2436] hover:bg-[#194159]">
                    <td className="sticky left-0 bg-[#10283c] px-4 py-3 text-center font-bold tabular-nums text-cyan-300 group-even:bg-[#0b2436] group-hover:bg-[#194159]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-medium text-white">{monthLabel(r.period)}</td>
                    {(['observed', 'trend', 'seasonal', 'residual'] as ComponentKey[]).map(k => <td key={k} className={`px-4 py-3 tabular-nums ${r[k] === null ? 'text-amber-300' : 'text-slate-200'}`} title={r[k] === null ? 'Không đủ cửa sổ thời gian để tính thành phần' : undefined}>{formatValue(r[k])}</td>)}
                  </tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Trang {page}/{pageCount} · Dòng {data.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, data.length)} / {data.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 rounded-lg border border-[#31556b] px-3 py-2 text-xs disabled:opacity-30"><ChevronLeft size={14}/> Trước</button>
            <span className="rounded-md bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">{page}</span>
            <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 rounded-lg border border-[#31556b] px-3 py-2 text-xs disabled:opacity-30">Tiếp <ChevronRight size={14}/></button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Dấu “—” là giá trị chưa thể tính được, không phải số 0. Xuất CSV lấy toàn bộ các tháng đã tải, không chỉ trang hiện tại.</p>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Method & Data Notes</h2>
          <button type="button" onClick={() => setShowMethod(v => !v)} className="rounded-lg border border-[#31556b] px-3 py-2 text-xs text-cyan-300">{showMethod ? 'Thu gọn' : 'Giải thích phương pháp'}</button>
        </div>
        <p className="mt-2 text-sm text-slate-300"><strong>Method:</strong> {method || 'Chưa có kết quả'} · <strong>Period:</strong> {period} tháng</p>
        {note && <p className="mt-2 text-xs text-amber-200">{note}</p>}
        {showMethod && <div className="mt-4 space-y-2 border-t border-[#31556b] pt-4 text-sm leading-6 text-slate-300">
          <p><strong>Observed:</strong> giá trị lịch sử theo tháng, không phải dự báo.</p>
          <p><strong>Trend:</strong> trung bình trượt 12 tháng căn giữa; thiếu ở hai đầu chuỗi.</p>
          <p><strong>Seasonal:</strong> sai lệch lặp lại theo tháng sau khi trừ Trend (additive).</p>
          <p><strong>Residual:</strong> Observed − Trend − Seasonal; không nội suy tháng thiếu.</p>
          <p><strong>Giới hạn:</strong> kết quả Mock chỉ để thử giao diện; không dùng để kết luận khí tượng hoặc dự đoán sóng.</p>
        </div>}
      </section>
    </div>
  )
}
