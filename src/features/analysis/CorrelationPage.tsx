import { useEffect, useMemo, useState } from 'react';
import { Activity, Info, RefreshCw } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import EChart from '../../components/charts/EChart';
import {
  METRICS, correlationMatrix, loadCorrelationSample, scatterPoints,
  type CorrelationSample, type Method, type Metric,
} from './data';

const NAMES: Record<Metric, string> = {
  WVHT: 'Độ cao sóng', DPD: 'Chu kỳ trội', APD: 'Chu kỳ trung bình',
  WSPD: 'Tốc độ gió', WTMP: 'Nhiệt độ nước biển',
};

function hstTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Pacific/Honolulu', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

export default function CorrelationPage() {
  const [method, setMethod] = useState<Method>('pearson');
  const [sample, setSample] = useState<CorrelationSample | null>(null);
  const [selectedPair, setSelectedPair] = useState<{ x: Metric; y: Metric } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSample(null);
    setSelectedPair(null);
    loadCorrelationSample(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setSample(result);
      const cells = correlationMatrix(result.rows, 'pearson').flat();
      const first = cells.find(cell => cell.x !== cell.y && cell.coefficient !== null);
      if (first) setSelectedPair({ x: first.x, y: first.y });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const matrix = useMemo(() => sample ? correlationMatrix(sample.rows, method) : [], [sample, method]);
  const selectedCell = selectedPair ? matrix[METRICS.indexOf(selectedPair.x)]?.[METRICS.indexOf(selectedPair.y)] : null;
  const points = useMemo(() => sample && selectedPair ? scatterPoints(sample.rows, selectedPair.x, selectedPair.y) : [], [sample, selectedPair]);
  const heatmapData: [number, number, number][] = [];
  matrix.forEach((row, x) => row.forEach((cell, y) => {
    if (cell.coefficient !== null) heatmapData.push([y, x, cell.coefficient]);
  }));

  const heatmapOptions: EChartsOption = {
    tooltip: {
      position: 'top', backgroundColor: '#0f2538', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number] };
        const cell = matrix[p.value[1]]?.[p.value[0]];
        return cell ? `${cell.x} ↔ ${cell.y}<br/>${method === 'pearson' ? 'r' : 'ρ'} = ${cell.coefficient?.toFixed(3)}<br/>${cell.paired_count} cặp hợp lệ` : '';
      },
    },
    grid: { left: '10%', right: '5%', top: '5%', bottom: '18%' },
    xAxis: { type: 'category', data: [...METRICS], axisLabel: { color: '#cbd5e1' } },
    yAxis: { type: 'category', data: [...METRICS], axisLabel: { color: '#cbd5e1' } },
    visualMap: {
      min: -1, max: 1, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
      inRange: { color: ['#991b1b', '#1e293b', '#0284c7'] }, textStyle: { color: '#94a3b8' },
    },
    series: [{
      type: 'heatmap', data: heatmapData,
      label: { show: true, color: '#fff', formatter: (value: unknown) => {
        const item = value as { value: [number, number, number] };
        return item.value[2].toFixed(2);
      } },
    }],
  };

  const scatterOptions: EChartsOption = {
    tooltip: {
      backgroundColor: '#0f2538', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (params: unknown) => {
        const p = params as { data: { value: [number, number]; name: string } };
        return `${p.data.name}<br/>${selectedPair?.x}: ${p.data.value[0]}<br/>${selectedPair?.y}: ${p.data.value[1]}`;
      },
    },
    grid: { left: '5%', right: '5%', top: '8%', bottom: '12%', containLabel: true },
    xAxis: { type: 'value', name: selectedPair?.x, axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', name: selectedPair?.y, axisLabel: { color: '#94a3b8' } },
    series: [{ type: 'scatter', data: points.map(point => ({ value: [point.x, point.y], name: hstTime(point.observed_at) })), symbolSize: 5, itemStyle: { color: '#0284c7' } }],
  };

  return <div className="space-y-5 text-slate-100">
    <header className="rounded-xl border border-[#28516a] bg-[#102d43] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">S05 · NOAA 51201</div>
          <h1 className="mt-2 text-2xl font-bold">Tương quan và phân tán quan trắc sóng</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Tính trên các quan trắc Silver có QC valid trong 30 ngày gần nhất. Ma trận và scatter dùng cùng một tập bản ghi; đây là thống kê mô tả, không phải kết quả Gold đã xử lý.</p>
        </div>
        <button type="button" onClick={() => setReload(value => value + 1)} disabled={loading} className="flex items-center gap-2 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-200 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới</button>
      </div>
      {sample && <p className="mt-4 text-xs text-slate-400">{sample.rows.length.toLocaleString('vi-VN')} quan trắc QC valid · {hstTime(sample.first_at)} → {hstTime(sample.last_at)} HST{sample.truncated ? ' · Đã chạm giới hạn 5.000 bản ghi; kết quả chỉ trên phần đã tải.' : ''}</p>}
    </header>

    {error && <div role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-4 text-sm text-rose-200">Không thể tải S05: {error}</div>}
    {loading && <div role="status" className="py-12 text-center text-slate-400">Đang tải quan trắc thật từ Backend...</div>}
    {!loading && sample && <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMethod('pearson')} aria-pressed={method === 'pearson'} className={`rounded-lg border px-3 py-2 text-xs ${method === 'pearson' ? 'border-cyan-500 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>Pearson · tuyến tính</button>
        <button type="button" onClick={() => setMethod('spearman')} aria-pressed={method === 'spearman'} className={`rounded-lg border px-3 py-2 text-xs ${method === 'spearman' ? 'border-cyan-500 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>Spearman · thứ hạng</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-700 bg-[#0f2538] p-5 lg:col-span-7">
          <h2 className="text-sm font-semibold">Ma trận {method === 'pearson' ? 'Pearson r' : 'Spearman ρ'}</h2>
          <p className="mt-1 text-xs text-slate-400">Chọn ô có hệ số để xem scatter. Ô trống nghĩa là chưa đủ cặp hoặc biến không thay đổi.</p>
          {heatmapData.length ? <EChart options={heatmapOptions} height={360} onEvents={{ click: (params: unknown) => {
            const p = params as { value: [number, number, number] };
            const x = METRICS[p.value[1]];
            const y = METRICS[p.value[0]];
            if (x !== y) setSelectedPair({ x, y });
          } }} /> : <p role="alert" className="mt-6 text-sm text-amber-200">Không đủ dữ liệu cặp biến để tính hệ số tương quan.</p>}
        </section>
        <section className="rounded-xl border border-slate-700 bg-[#0f2538] p-5 lg:col-span-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Activity size={16} /> Phân tán quan trắc</h2>
          {selectedPair && selectedCell && selectedCell.coefficient !== null ? <>
            <p className="mt-2 text-xs text-slate-300">{NAMES[selectedPair.x]} ↔ {NAMES[selectedPair.y]} · {method === 'pearson' ? 'r' : 'ρ'} = {selectedCell.coefficient.toFixed(3)} · {selectedCell.paired_count.toLocaleString('vi-VN')} cặp</p>
            <EChart options={scatterOptions} height={310} />
            <p className="mt-2 text-xs text-slate-400">Mỗi điểm là một quan trắc có đủ cả hai biến. Hệ số tương quan không chứng minh quan hệ nguyên nhân.</p>
          </> : <p className="mt-6 text-sm text-amber-200">Chưa có cặp biến đủ dữ liệu để hiển thị scatter.</p>}
        </section>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-[#09283b] p-4 text-xs leading-5 text-cyan-200"><Info size={16} className="mt-0.5 shrink-0" /><p>Hệ số tính theo từng cặp từ các giá trị không thiếu; số cặp có thể khác nhau. Hướng sóng MWD là biến góc nên không đưa vào phép tương quan tuyến tính này. WSPD là tốc độ gió đo được.</p></div>
    </>}
  </div>;
}
