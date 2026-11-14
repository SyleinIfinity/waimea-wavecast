import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, RefreshCw, Waves } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import EChart from '../../components/charts/EChart';
import { getForwardForecasts, getShadowForecasts } from '../../api/client';
import type { ForecastHorizon, ForecastSource, IssuedForecast } from '../../api/types';

const HORIZONS: ForecastHorizon[] = ['30min', '1d', '7d', '30d'];
const HORIZON_LABELS: Record<ForecastHorizon, string> = {
  '30min': '30 phút', '1d': '1 ngày', '7d': '7 ngày', '30d': '30 ngày',
};
const SOURCE_LABELS: Record<ForecastSource, string> = {
  forward: 'Forward · experimental', shadow: 'Calisthenics 1.5 · shadow',
};

function hstTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Pacific/Honolulu', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function metres(value: number | null): string {
  return value == null ? 'Chưa có' : `${value.toFixed(2)} m`;
}

function evaluationState(row: IssuedForecast): string {
  if (row.actual_value != null && row.evaluated_at) return 'Đã đối chiếu';
  return Date.parse(row.target_at) > Date.now() ? 'Chưa đến hạn' : 'Chưa có quan trắc đã đối chiếu';
}

function ForecastCard({ row, horizon }: { row?: IssuedForecast; horizon: ForecastHorizon }) {
  return <div className="rounded-xl border border-slate-700 bg-[#0f2538] p-4">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-slate-200">{HORIZON_LABELS[horizon]}</span>
      <span className="rounded bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">{row?.quality_status ?? 'Chưa có dữ liệu'}</span>
    </div>
    {row ? <>
      <div className="mt-3 text-2xl font-bold tabular-nums text-cyan-200">{metres(row.predicted_value)}</div>
      <div className="mt-1 text-xs text-slate-400">{row.target_kind === 'instant_wvht' ? 'WVHT tại thời điểm mục tiêu' : 'Trung vị WVHT ngày mục tiêu'}</div>
      <dl className="mt-4 space-y-1.5 text-xs text-slate-400">
        <div className="flex justify-between gap-3"><dt>Phát hành (HST)</dt><dd className="text-right text-slate-200">{hstTime(row.issued_at)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Mục tiêu (HST)</dt><dd className="text-right text-slate-200">{hstTime(row.target_at)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Quan trắc</dt><dd className="text-right text-slate-200">{metres(row.actual_value)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Sai số tuyệt đối</dt><dd className="text-right text-slate-200">{metres(row.absolute_error)}</dd></div>
      </dl>
      <p className="mt-3 border-t border-slate-700 pt-2 text-[11px] text-slate-400">{evaluationState(row)} · Model {row.model_version}</p>
    </> : <p className="mt-4 text-sm text-amber-200">API chưa có dự báo cho horizon này.</p>}
  </div>;
}

export default function ForecastPage() {
  const [forward, setForward] = useState<IssuedForecast[]>([]);
  const [shadow, setShadow] = useState<IssuedForecast[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | ForecastSource>('all');
  const [horizonFilter, setHorizonFilter] = useState<'all' | ForecastHorizon>('all');
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => setReload(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setRefreshing(true);
      const results = await Promise.allSettled([
        getForwardForecasts(controller.signal),
        ...HORIZONS.map(horizon => getShadowForecasts(horizon, controller.signal)),
      ]);
      if (controller.signal.aborted) return;
      const problems: string[] = [];
      const first = results[0];
      setForward(first.status === 'fulfilled' ? first.value : []);
      if (first.status === 'rejected') problems.push(`Forward: ${String(first.reason instanceof Error ? first.reason.message : first.reason)}`);
      const shadowRows: IssuedForecast[] = [];
      results.slice(1).forEach((result, index) => {
        if (result.status === 'fulfilled') shadowRows.push(...result.value);
        else problems.push(`Shadow ${HORIZON_LABELS[HORIZONS[index]]}: ${String(result.reason instanceof Error ? result.reason.message : result.reason)}`);
      });
      setShadow(shadowRows);
      setErrors(problems);
      setLoadedAt(new Date().toISOString());
      setLoading(false);
      setRefreshing(false);
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [reload]);

  const allRows = useMemo(() => [...forward, ...shadow].sort((a, b) => Date.parse(b.issued_at) - Date.parse(a.issued_at)), [forward, shadow]);
  const selectedRows = useMemo(() => allRows.filter(row =>
    (sourceFilter === 'all' || row.source === sourceFilter) &&
    (horizonFilter === 'all' || row.horizon === horizonFilter),
  ).slice(0, 30), [allRows, sourceFilter, horizonFilter]);
  const chartRows = useMemo(() => selectedRows.slice(0, 20).reverse(), [selectedRows]);
  const chartOptions: EChartsOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#0f2538', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    legend: { data: ['Dự báo', 'Quan trắc'], textStyle: { color: '#cbd5e1' } },
    grid: { left: 55, right: 18, top: 50, bottom: 65 },
    xAxis: { type: 'category', data: chartRows.map(row => hstTime(row.target_at)), axisLabel: { color: '#94a3b8', rotate: 30 } },
    yAxis: { type: 'value', name: 'WVHT (m)', axisLabel: { color: '#94a3b8' } },
    series: [
      { name: 'Dự báo', type: 'line', data: chartRows.map(row => row.predicted_value), connectNulls: false, itemStyle: { color: '#22d3ee' } },
      { name: 'Quan trắc', type: 'line', data: chartRows.map(row => row.actual_value), connectNulls: false, itemStyle: { color: '#fbbf24' } },
    ],
  };

  return <div className="space-y-6 text-slate-100">
    <header className="rounded-xl border border-[#28516a] bg-[#102d43] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300"><Waves size={16} /> S07 · NOAA 51201</div>
          <h1 className="mt-2 text-2xl font-bold">Dự báo sóng đang phát hành</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Kết quả forward experimental và Calisthenics 1.5 shadow từ Backend. Đây là dữ liệu thử nghiệm; trạng thái đối chiếu chỉ xuất hiện khi đã có quan trắc được đánh giá.</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-200 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Làm mới</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Activity size={14} /> {allRows.length} bản ghi đã tải</span>
        <span className="flex items-center gap-1"><CalendarClock size={14} /> {loadedAt ? `Tải lúc ${hstTime(loadedAt)} HST` : 'Chưa tải'}</span>
        <span>Tự cập nhật mỗi 60 giây</span>
      </div>
    </header>

    {errors.map(error => <div key={error} role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-4 text-sm text-rose-200">{error}</div>)}
    {loading ? <div role="status" className="py-10 text-center text-slate-400">Đang tải dự báo từ Backend...</div> : <>
      {allRows.length === 0 && <div role="alert" className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">Backend chưa trả dự báo cho các luồng đang hiển thị.</div>}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Forward · experimental</h2>
        <div className="grid gap-3 md:grid-cols-3">{HORIZONS.filter(h => h !== '30d').map(horizon => <ForecastCard key={horizon} horizon={horizon} row={forward.find(row => row.horizon === horizon)} />)}</div>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Calisthenics 1.5 · shadow</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{HORIZONS.map(horizon => <ForecastCard key={horizon} horizon={horizon} row={shadow.find(row => row.horizon === horizon)} />)}</div>
      </section>
      <section className="rounded-xl border border-slate-700 bg-[#0f2538] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Lịch sử dự báo đã tải</h2>
          <div className="flex gap-2">
            <select aria-label="Nguồn dự báo" value={sourceFilter} onChange={event => setSourceFilter(event.target.value as typeof sourceFilter)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs"><option value="all">Mọi nguồn</option><option value="forward">Forward</option><option value="shadow">Shadow</option></select>
            <select aria-label="Horizon" value={horizonFilter} onChange={event => setHorizonFilter(event.target.value as typeof horizonFilter)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs"><option value="all">Mọi horizon</option>{HORIZONS.map(horizon => <option key={horizon} value={horizon}>{HORIZON_LABELS[horizon]}</option>)}</select>
          </div>
        </div>
        {selectedRows.length === 0 ? <p className="mt-4 text-sm text-amber-200">Không có dự báo từ Backend cho bộ lọc này.</p> : <>
          {sourceFilter !== 'all' && horizonFilter !== 'all' && <div className="mt-5"><EChart options={chartOptions} height={280} /></div>}
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-700 text-slate-400"><tr><th className="p-2">Nguồn / horizon</th><th className="p-2">Phát hành (HST)</th><th className="p-2">Mục tiêu (HST)</th><th className="p-2">Dự báo</th><th className="p-2">Quan trắc</th><th className="p-2">Sai số</th><th className="p-2">Trạng thái</th></tr></thead>
            <tbody>{selectedRows.map(row => <tr key={`${row.source}-${row.forecast_id}`} className="border-b border-slate-800 text-slate-200"><td className="p-2"><div>{SOURCE_LABELS[row.source]}</div><div className="text-slate-400">{HORIZON_LABELS[row.horizon]} · {row.model_version}</div></td><td className="p-2 whitespace-nowrap">{hstTime(row.issued_at)}</td><td className="p-2 whitespace-nowrap">{hstTime(row.target_at)}</td><td className="p-2 tabular-nums">{metres(row.predicted_value)}</td><td className="p-2 tabular-nums">{metres(row.actual_value)}</td><td className="p-2 tabular-nums">{metres(row.absolute_error)}</td><td className="p-2">{evaluationState(row)}</td></tr>)}</tbody>
          </table></div>
        </>}
      </section>
    </>}
  </div>;
}
