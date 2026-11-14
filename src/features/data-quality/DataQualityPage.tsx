import { useEffect, useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import {
  Activity, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Database, Download, Filter, Info, RefreshCw, Search, ShieldCheck, Waves,
} from 'lucide-react'
import EChart from '../../components/charts/EChart'
import { loadQualityOverview, type QualityResult } from './api'
import {
  calendarDates, csvCell, hstToday, monthlyQuality, summarize, validateRange,
  type DailyQuality, type QualityRange,
} from './quality'

const panel = 'rounded-2xl border border-[#264b63] bg-[#10283c] p-5'
const input = 'min-h-11 w-full rounded-xl border border-[#31556b] bg-[#081d30] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#31556b] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-[#193b51] focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40'
const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('vi-VN')
const percent = (value: number | null | undefined) => value == null ? 'N/A' : `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
const monthLabel = (month: string) => `${month.slice(5, 7)}/${month.slice(0, 4)}`
const PAGE_SIZE = 12

function initialRange(): QualityRange {
  const to = hstToday()
  return { from: `${to.slice(0, 4)}-01-01`, to }
}

function downloadCsv(name: string, headings: string[], rows: unknown[][]) {
  const csv = [headings, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url; link.download = name
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[#31556b] bg-[#091f30] px-5 py-9 text-center">
    <Database size={28} className="mb-3 text-cyan-400/60" />
    <p className="max-w-xl text-sm leading-6 text-slate-400">{children}</p>
  </div>
}

export default function DataQualityPage() {
  const [defaults] = useState(initialRange)
  const [draft, setDraft] = useState(defaults)
  const [applied, setApplied] = useState(defaults)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<QualityResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [month, setMonth] = useState('all')
  const [dayFilter, setDayFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('all')
  const [issueStatus, setIssueStatus] = useState('all')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null); setResult(null)
    loadQualityOverview(applied, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không thể tải Data Quality.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [applied, reload])

  const data = result?.overview
  const stats = data ? summarize(data) : null
  const empty = data?.daily.length === 0 && data.issues.every(issue => issue.count === 0)
  const months = useMemo(() => monthlyQuality(data?.daily ?? [], applied), [data, applied])
  const dates = useMemo(() => {
    const byDate = new Map(data?.daily.map(day => [day.date_hst, day]) ?? [])
    return calendarDates(applied).map(date => ({ date, day: byDate.get(date) }))
  }, [data, applied])
  const visibleDates = useMemo(() => dates.filter(({ date, day }) => {
    if (month !== 'all' && !date.startsWith(month)) return false
    if (search && !date.includes(search.trim()) && !dayLabel(date).includes(search.trim())) return false
    if (dayFilter === 'no-records') return !day
    if (dayFilter === 'unknown') return !!day && day.coverage_ratio === null
    if (dayFilter === 'not-valid') return !!day && day.valid_wave_count < day.sample_count
    return true
  }), [dates, month, search, dayFilter])
  const chartDays = useMemo(() => dates.filter(({ date }) => month === 'all' || date.startsWith(month)), [dates, month])
  const issues = data?.issues.filter(issue => (severity === 'all' || issue.severity === severity) && (issueStatus === 'all' || issue.status === issueStatus)) ?? []
  const issueTotal = issues.reduce((sum, issue) => sum + issue.count, 0)
  const maxPage = Math.max(1, Math.ceil(visibleDates.length / PAGE_SIZE))
  const currentPage = Math.min(page, maxPage)
  const tableRows = visibleDates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const missingDays = dates.filter(({ day }) => !day).length

  const options: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    color: ['#22d3ee', '#f5b868', '#b8a1ff'],
    legend: { top: 0, textStyle: { color: '#a2bfd1', fontSize: 11 } },
    grid: { left: 58, right: 58, top: 64, bottom: 80 },
    tooltip: { trigger: 'axis', valueFormatter: value => value == null ? 'N/A' : String(value) },
    xAxis: { type: 'category', data: chartDays.map(row => row.date), axisLabel: { color: '#9fbace', hideOverlap: true }, axisLine: { lineStyle: { color: '#31556b' } } },
    yAxis: [
      { type: 'value', name: 'Số mẫu', min: 0, minInterval: 1, nameTextStyle: { color: '#9fbace' }, axisLabel: { color: '#9fbace' }, splitLine: { lineStyle: { color: '#244459' } } },
      { type: 'value', name: 'Coverage (%)', min: 0, max: 100, nameTextStyle: { color: '#b8a1ff' }, axisLabel: { color: '#b8a1ff' }, splitLine: { show: false } },
    ],
    dataZoom: [{ type: 'inside', zoomOnMouseWheel: 'shift' }, { type: 'slider', bottom: 10, height: 18 }],
    series: [
      { name: 'WVHT hợp lệ', type: 'bar', stack: 'samples', data: chartDays.map(row => row.day?.valid_wave_count ?? null), barMaxWidth: 16 },
      { name: 'WVHT chưa hợp lệ', type: 'bar', stack: 'samples', data: chartDays.map(({ day }) => day ? day.sample_count - day.valid_wave_count : null), barMaxWidth: 16 },
      { name: 'Coverage (%)', type: 'line', yAxisIndex: 1, connectNulls: false, showSymbol: chartDays.length <= 31, data: chartDays.map(({ day }) => day?.coverage_ratio == null ? null : Number((day.coverage_ratio * 100).toFixed(2))) },
    ],
  }), [chartDays])

  function apply(range: QualityRange) {
    const validation = validateRange(range)
    if (validation) { setFilterError(validation); return }
    if (range.to > hstToday()) { setFilterError('Vui lòng chọn ngày không vượt quá ngày hiện tại ở Hawaii.'); return }
    setFilterError(null); setDraft(range); setApplied({ ...range })
    setMonth('all'); setDayFilter('all'); setSearch(''); setPage(1)
    setSeverity('all'); setIssueStatus('all')
  }

  function quickRange(days: number) {
    const to = hstToday()
    const from = new Date(Date.parse(`${to}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10)
    apply({ from, to })
  }

  function selectMonth(value: string) { setMonth(value); setPage(1) }

  function exportDaily() {
    if (!result) return
    downloadCsv(`waimea-s09-daily-${applied.from}-${applied.to}.csv`,
      ['date_hst', 'sample_count', 'valid_wave_count', 'coverage_ratio', 'daily_feature_available', 'data_mode'],
      visibleDates.map(({ date, day }) => [date, day?.sample_count, day?.valid_wave_count, day?.coverage_ratio, day ? 'yes' : 'no', 'BACKEND']))
  }

  function exportIssues() {
    if (!result) return
    downloadCsv(`waimea-s09-qc-${applied.from}-${applied.to}.csv`,
      ['start_hst', 'end_hst', 'severity', 'status', 'issue_count', 'data_mode'],
      issues.map(issue => [applied.from, applied.to, issue.severity, issue.status, issue.count, 'BACKEND']))
  }

  return <div className="min-w-0 space-y-6 text-slate-100" aria-busy={loading}>
    <header className="rounded-2xl border border-[#28516a] bg-[#102d43] p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400"><Waves size={17} /> S09 · NOAA Station 51201</div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-extrabold text-white sm:text-3xl">Data Quality &amp; Provenance</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Theo dõi độ đầy đủ của dữ liệu, chất lượng WVHT và các vấn đề kiểm tra tại trạm Waimea Bay.</p></div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-300"><ShieldCheck size={25} /></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-300">Station 51201 · Ngày Hawaii (HST)</span>
        <span role="status" className={`rounded-lg px-3 py-1.5 font-semibold ${error ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-500/15 text-slate-300'}`}>
          {loading ? 'ĐANG TẢI...' : error ? 'DATA UNAVAILABLE' : empty ? 'EMPTY DATA' : 'BACKEND DATA'}
        </span>
      </div>
    </header>

    <section className={panel} aria-labelledby="s09-filters">
      <h2 id="s09-filters" className="mb-4 flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-cyan-400" /> Phạm vi kiểm tra dữ liệu</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2 text-xs text-slate-400">Từ ngày (HST)<input className={input} type="date" value={draft.from} max={hstToday()} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
        <label className="space-y-2 text-xs text-slate-400">Đến ngày (HST)<input className={input} type="date" value={draft.to} max={hstToday()} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
        <label className="space-y-2 text-xs text-slate-400">Chọn nhanh theo năm<select className={input} value="" onChange={e => { if (e.target.value) { const year = e.target.value; apply({ from: `${year}-01-01`, to: year === hstToday().slice(0, 4) ? hstToday() : `${year}-12-31` }) } }}>
          <option value="">Chọn năm để áp dụng...</option>
          {Array.from({ length: Number(hstToday().slice(0, 4)) - 2005 + 1 }, (_, i) => Number(hstToday().slice(0, 4)) - i).map(year => <option key={year} value={year}>{year}</option>)}
        </select></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => apply(draft)} className="min-h-11 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#062235] hover:bg-cyan-400">Áp dụng</button>
        <button type="button" className={button} onClick={() => apply(initialRange())}>Đặt lại</button>
        <button type="button" className={button} disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới</button>
        <span className="px-1 text-xs text-slate-500">Khoảng nhanh:</span>
        {[30, 90, 365].map(days => <button key={days} type="button" className={button} onClick={() => quickRange(days)}>{days} ngày</button>)}
      </div>
      {filterError && <p role="alert" className="mt-3 text-sm text-amber-300">{filterError}</p>}
      <p className="mt-3 text-xs leading-5 text-slate-400">Đang xem: <strong className="font-medium text-slate-200">{dayLabel(applied.from)} → {dayLabel(applied.to)} HST</strong>. Làm mới chỉ đọc dữ liệu đã xử lý, không chạy thu thập NOAA.</p>
    </section>

    {error && <section role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5">
      <h2 className="font-semibold text-rose-300">Không thể tải chất lượng dữ liệu</h2><p className="mt-2 text-sm text-rose-200">{error}</p>
      <button type="button" className={button + ' mt-4'} onClick={() => setReload(n => n + 1)}><RefreshCw size={15} /> Thử lại</button>
    </section>}
    {loading ? <div className="space-y-5" role="status" aria-label="Đang tải thống kê chất lượng"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#193b50]" />)}</div><div className="h-72 animate-pulse rounded-2xl bg-[#193b50]" /></div> : result && data && stats && <>
      <div className={`flex items-start gap-3 rounded-xl border p-4 text-xs leading-6 border-cyan-500/20 bg-[#09283b] text-cyan-200`}>
        <Info size={17} className="mt-1 shrink-0" /><div>Dữ liệu tổng hợp từ Backend · chỉ hiển thị các thống kê API cung cấp.
          <p className="text-slate-400">Màn hình tải lúc {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Pacific/Honolulu', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(result.loadedAt))} HST. Đây là thời điểm tải giao diện, không phải lần thu thập NOAA gần nhất.</p></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Tổng mẫu quan trắc', value: number(stats.samples), detail: `${number(stats.daysWithSamples)} ngày có mẫu / ${dates.length} ngày chọn`, icon: Database, color: 'text-cyan-400' },
          { title: 'WVHT hợp lệ', value: percent(stats.validRatio), detail: `${number(stats.valid)} / ${number(stats.samples)} mẫu`, icon: CheckCircle2, color: 'text-emerald-400' },
          { title: 'Coverage trung bình ngày', value: percent(stats.meanCoverage), detail: `${number(stats.coverageDays)} ngày có coverage được API xác định`, icon: Activity, color: 'text-violet-400' },
          { title: 'Vấn đề QC đang mở', value: number(stats.openIssues), detail: 'Tổng số vấn đề có trạng thái open', icon: ShieldCheck, color: 'text-amber-400' },
        ].map(card => <div key={card.title} className={panel}><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">{card.title}</span><card.icon size={19} className={card.color} /></div><div className="mt-4 text-3xl font-bold tabular-nums text-white">{card.value}</div><p className="mt-3 text-xs leading-5 text-slate-400">{card.detail}</p></div>)}
      </div>

      {empty && <Empty>Chưa có thống kê chất lượng dữ liệu trong khoảng ngày này. Không có bản ghi tổng hợp không có nghĩa độ cao sóng bằng 0. Hãy chọn khoảng ngày khác hoặc kiểm tra tiến độ xử lý dữ liệu.</Empty>}

      <section className={panel} aria-labelledby="s09-coverage">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="s09-coverage" className="flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-cyan-400" /> Coverage theo tháng</h2><p className="mt-2 text-xs leading-5 text-slate-400">Trung bình coverage của các ngày có giá trị trong phạm vi đã chọn. Chọn tháng để lọc biểu đồ và bảng ngày.</p></div><button type="button" className={button} onClick={() => selectMonth('all')} aria-pressed={month === 'all'}>Tất cả tháng</button></div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {months.map(item => <button type="button" key={item.month} onClick={() => selectMonth(month === item.month ? 'all' : item.month)} aria-pressed={month === item.month}
            className={`min-h-28 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-cyan-400 ${month === item.month ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-[#31556b] hover:border-cyan-500/70'}`}
            style={{ backgroundColor: item.meanCoverage === null ? '#0a2133' : `rgba(6, 182, 212, ${0.06 + item.meanCoverage * 0.18})` }}>
            <div className="flex justify-between gap-2 text-xs"><span className="font-semibold text-slate-200">{monthLabel(item.month)}</span>{month === item.month && <CheckCircle2 size={14} className="text-cyan-300" />}</div>
            <div className="mt-3 text-xl font-bold tabular-nums text-cyan-200">{percent(item.meanCoverage)}</div>
            <p className="mt-1 text-[11px] text-slate-400">{item.days === 0 ? 'Chưa có bản ghi ngày' : `${item.coverageDays}/${item.days} ngày có coverage`}</p>
          </button>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">N/A = chưa xác định coverage. Màu đậm hơn biểu thị coverage cao hơn, không phải ngưỡng đánh giá đạt/không đạt. Tháng ở biên chỉ tính phần nằm trong khoảng lọc.</p>
      </section>

      <section className={panel} aria-labelledby="s09-daily-chart">
        <h2 id="s09-daily-chart" className="flex items-center gap-2 font-bold"><Activity size={18} className="text-cyan-400" /> Daily Quality Overview {month !== 'all' && <span className="text-xs font-normal text-slate-400">· {monthLabel(month)}</span>}</h2>
        <p className="mb-5 mt-2 text-xs leading-5 text-slate-400">Số mẫu hợp lệ và chưa hợp lệ của WVHT (trục trái); coverage do Backend trả về (trục phải). Bảng bên dưới cung cấp số liệu tương ứng.</p>
        {chartDays.some(row => !!row.day) ? <div role="img" aria-label="Biểu đồ số mẫu WVHT và coverage theo ngày HST"><EChart options={options} height={340} /></div> : <Empty>Chưa có dữ liệu tổng hợp ngày để vẽ biểu đồ trong phạm vi này.</Empty>}
        <p className="mt-3 text-xs leading-5 text-amber-200/90">Mẫu chưa hợp lệ = sample_count − valid_wave_count; có thể thiếu hoặc không đạt QC, không đồng nghĩa số mẫu thiếu. Không tự giả định chu kỳ lấy mẫu để tính coverage.</p>
      </section>

      <section className={panel} aria-labelledby="s09-daily-table">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="s09-daily-table" className="font-bold">Daily Completeness Details</h2><p className="mt-1 text-xs text-slate-400">{number(missingDays)} ngày chưa có bản ghi tổng hợp trong toàn phạm vi. Đây chưa phải số gaps đã xác nhận.</p></div><button type="button" className={button} onClick={exportDaily} disabled={!visibleDates.length}><Download size={15} /> Xuất CSV ngày</button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-[#31556b] bg-[#081d30] px-3 focus-within:border-cyan-400"><Search size={16} className="shrink-0 text-slate-400" /><input aria-label="Tìm ngày HST" type="search" placeholder="Tìm ngày: YYYY-MM-DD hoặc DD/MM/YYYY" className="min-h-11 min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></label>
          <label className="sr-only" htmlFor="s09-day-filter">Lọc thống kê ngày</label><select id="s09-day-filter" className={input} value={dayFilter} onChange={e => { setDayFilter(e.target.value); setPage(1) }}><option value="all">Tất cả trạng thái ngày</option><option value="no-records">Chưa có bản ghi ngày</option><option value="unknown">Có bản ghi · coverage chưa xác định</option><option value="not-valid">Có mẫu WVHT chưa hợp lệ</option></select>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#31556b]"><table className="w-full min-w-[750px] text-left text-xs">
          <thead className="bg-[#081d30] text-slate-400"><tr>{['Ngày (HST)', 'Tổng mẫu', 'WVHT hợp lệ', 'WVHT chưa hợp lệ', 'Coverage', 'Trạng thái dữ liệu'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{tableRows.length ? tableRows.map(({ date, day }) => <DailyRow key={date} date={date} day={day} />) : <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Không có ngày phù hợp với bộ lọc.</td></tr>}</tbody>
        </table></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">Trang {currentPage}/{maxPage} · {visibleDates.length} ngày · CSV gồm toàn bộ ngày phù hợp bộ lọc</p><div className="flex gap-2"><button type="button" className={button} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /> Trước</button><button type="button" className={button} disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>Tiếp <ChevronRight size={15} /></button></div></div>
      </section>

      <section className={panel} aria-labelledby="s09-issues">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="s09-issues" className="flex items-center gap-2 font-bold"><Filter size={18} className="text-cyan-400" /> Quality Issues Summary</h2><p className="mt-2 text-xs text-slate-400">Tổng hợp toàn khoảng {dayLabel(applied.from)} → {dayLabel(applied.to)} HST; không thay đổi khi chọn tháng phía trên.</p></div><button type="button" className={button} disabled={!issues.length} onClick={exportIssues}><Download size={15} /> Xuất CSV QC</button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs text-slate-400">Mức độ<select className={input} value={severity} onChange={e => setSeverity(e.target.value)}><option value="all">Tất cả mức độ</option><option value="info">Info · Thông tin</option><option value="warning">Warning · Cảnh báo</option><option value="error">Error · Lỗi</option></select></label><label className="space-y-2 text-xs text-slate-400">Trạng thái<select className={input} value={issueStatus} onChange={e => setIssueStatus(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="open">Open · Đang mở</option><option value="resolved">Resolved · Đã xử lý</option><option value="ignored">Ignored · Đã bỏ qua</option></select></label></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#31556b]"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-[#081d30] text-xs text-slate-400"><tr><th scope="col" className="px-4 py-3">Mức độ</th><th scope="col" className="px-4 py-3">Trạng thái</th><th scope="col" className="px-4 py-3 text-right">Số vấn đề</th></tr></thead><tbody>{issues.length ? issues.map((issue, i) => <tr key={`${issue.severity}-${issue.status}-${i}`} className="border-t border-[#264b63] odd:bg-[#0c2437]"><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${issue.severity === 'error' ? 'bg-rose-500/10 text-rose-300' : issue.severity === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'}`}>{issue.severity}</span></td><td className="px-4 py-3 text-slate-300">{issue.status}</td><td className="px-4 py-3 text-right font-mono tabular-nums text-white">{number(issue.count)}</td></tr>) : <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">Không có nhóm vấn đề QC phù hợp. Điều này không tự xác nhận dữ liệu đã đầy đủ.</td></tr>}</tbody></table></div>
        <p className="mt-3 text-xs text-slate-400">{number(issueTotal)} vấn đề trong bộ lọc. Một quan trắc có thể có nhiều vấn đề QC; không dùng số vấn đề làm tỷ lệ mẫu lỗi.</p>
      </section>
    </>}

    <section className={panel} aria-labelledby="s09-lineage">
      <h2 id="s09-lineage" className="flex items-center gap-2 font-bold"><Database size={18} className="text-cyan-400" /> Data Provenance</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">Luồng dữ liệu theo kiến trúc hệ thống. Sơ đồ mô tả các bước xử lý, không phải xác nhận trạng thái kết nối hiện tại.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ['01', 'NOAA NDBC 51201', 'Nguồn dữ liệu quan trắc tại Waimea Bay'],
        ['02', 'Bronze · Raw source', 'Lưu nguồn gốc và phiên bản dữ liệu thô'],
        ['03', 'Silver · QC & Daily', 'Chuẩn hóa, kiểm tra chất lượng và tổng hợp ngày HST'],
        ['04', 'Data Quality Overview', 'Đọc thống kê daily và tổng hợp QC qua REST API'],
      ].map(([step, title, description], i) => <div key={step} className="rounded-xl border border-[#31556b] bg-[#0a2133] p-4"><div className="flex items-center justify-between text-xs font-mono text-cyan-400"><span>{step}</span>{i < 3 && <ArrowRight size={15} />}</div><h3 className="mt-3 text-sm font-semibold text-slate-200">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></div>)}</div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#31556b] p-4"><h3 className="text-sm font-semibold text-slate-200">Cách đọc số liệu</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-slate-400"><li>Coverage trung bình là trung bình các ngày có coverage; không phải coverage toàn kỳ theo số mẫu kỳ vọng.</li><li>N/A hoặc “—” là chưa có số liệu tương ứng; giá trị 0 được giữ nguyên khi API trả về.</li><li>Ngày không có bản ghi tổng hợp chưa chứng minh nguồn NOAA thiếu quan trắc; cần kiểm tra quá trình xử lý và gaps.</li></ul></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-amber-200"><Info size={16} /> Chi tiết chưa được cung cấp</h3><p className="mt-3 text-xs leading-6 text-slate-400">API overview chưa trả tỷ lệ thiếu theo từng trường NOAA, danh sách gaps, từng issue hoặc phiên bản source file/parser. Các phần này sẽ hiển thị khi Backend có dữ liệu tương ứng. Ngày tải màn hình không thay thế thời điểm thu thập hay xử lý dữ liệu.</p></div>
      </div>
    </section>
    <footer className="border-t border-[#264b63] pt-4 text-xs leading-5 text-slate-500">Waimea WaveCast · Frontend Core TL02 · Data Quality S09 · Ngày tổng hợp theo Pacific/Honolulu.</footer>
  </div>
}

function DailyRow({ date, day }: { date: string; day: DailyQuality | undefined }) {
  return <tr className="border-t border-[#264b63] odd:bg-[#10283c] even:bg-[#0b2436] hover:bg-[#194159]">
    <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">{dayLabel(date)}</th>
    <td className="px-4 py-3 font-mono tabular-nums">{number(day?.sample_count)}</td>
    <td className="px-4 py-3 font-mono tabular-nums text-cyan-200">{number(day?.valid_wave_count)}</td>
    <td className="px-4 py-3 font-mono tabular-nums">{day ? number(day.sample_count - day.valid_wave_count) : '—'}</td>
    <td className="px-4 py-3 font-mono tabular-nums">{percent(day?.coverage_ratio)}</td>
    <td className="px-4 py-3 text-slate-400">{!day ? 'Chưa có bản ghi ngày' : day.sample_count === 0 ? 'Có bản ghi · 0 mẫu' : day.coverage_ratio === null ? 'Coverage chưa xác định' : 'Có thống kê ngày'}</td>
  </tr>
}
