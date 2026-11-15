import { useEffect, useMemo, useState } from 'react';
import { Activity, Info, RefreshCw, BarChart2, HelpCircle } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import EChart from '../../components/charts/EChart';
import {
  METRICS, correlationMatrix, loadCorrelationSample, scatterPoints,
  type CorrelationSample, type Method, type Metric,
} from './data';

const NAMES: Record<Metric, { label: string; unit: string; desc: string }> = {
  WVHT: { label: 'Độ cao sóng có nghĩa', unit: 'm', desc: 'Chiều cao trung bình của một phần ba các con sóng cao nhất' },
  DPD: { label: 'Chu kỳ sóng trội', unit: 's', desc: 'Chu kỳ của các con sóng mang nhiều năng lượng nhất' },
  APD: { label: 'Chu kỳ sóng trung bình', unit: 's', desc: 'Chu kỳ trung bình của toàn bộ các con sóng ghi nhận được' },
  WSPD: { label: 'Tốc độ gió', unit: 'm/s', desc: 'Tốc độ gió bề mặt đo được tại phao' },
  WTMP: { label: 'Nhiệt độ nước biển', unit: '°C', desc: 'Nhiệt độ mặt nước biển bề mặt đo tại thân phao' },
};

function formatUtcAndHst(isoString: string): { utc: string; hst: string } {
  const d = new Date(isoString);
  const utc = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  const hst = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Pacific/Honolulu', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  return { utc: `${utc} UTC`, hst: `${hst} HST` };
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
    loadCorrelationSample(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSample(result);
        const cells = correlationMatrix(result.rows, 'pearson').flat();
        const first = cells.find((cell) => cell.x !== cell.y && cell.coefficient !== null);
        if (first) setSelectedPair({ x: first.x, y: first.y });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const matrix = useMemo(() => (sample ? correlationMatrix(sample.rows, method) : []), [sample, method]);
  const selectedCell = selectedPair
    ? matrix[METRICS.indexOf(selectedPair.x)]?.[METRICS.indexOf(selectedPair.y)]
    : null;
  const points = useMemo(
    () => (sample && selectedPair ? scatterPoints(sample.rows, selectedPair.x, selectedPair.y) : []),
    [sample, selectedPair]
  );

  const heatmapData: [number, number, number][] = [];
  matrix.forEach((row, x) =>
    row.forEach((cell, y) => {
      if (cell.coefficient !== null) heatmapData.push([y, x, cell.coefficient]);
    })
  );

  const heatmapOptions: EChartsOption = {
    tooltip: {
      position: 'top',
      backgroundColor: '#0f2538',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number] };
        const cell = matrix[p.value[1]]?.[p.value[0]];
        if (!cell) return '';
        const nameX = NAMES[cell.x].label;
        const nameY = NAMES[cell.y].label;
        return `
          <div class="p-1 text-xs">
            <div class="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1">${nameX} ↔ ${nameY}</div>
            <div>Hệ số ${method === 'pearson' ? 'Pearson (r)' : 'Spearman (ρ)'}: <strong class="text-cyan-300 font-mono">${cell.coefficient?.toFixed(3)}</strong></div>
            <div class="text-slate-400 mt-0.5">Số cặp quan trắc hợp lệ: <strong class="text-slate-200 font-mono">${cell.paired_count.toLocaleString('vi-VN')}</strong></div>
          </div>
        `;
      },
    },
    grid: { left: '12%', right: '5%', top: '5%', bottom: '20%' },
    xAxis: {
      type: 'category',
      data: [...METRICS],
      axisLabel: {
        color: '#cbd5e1',
        formatter: (val: string) => `${val}\n(${NAMES[val as Metric]?.unit || ''})`,
      },
    },
    yAxis: {
      type: 'category',
      data: [...METRICS],
      axisLabel: {
        color: '#cbd5e1',
        formatter: (val: string) => `${val} (${NAMES[val as Metric]?.unit || ''})`,
      },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#ef4444', '#1e293b', '#0284c7'] },
      textStyle: { color: '#94a3b8' },
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
          fontWeight: 'bold',
          formatter: (value: unknown) => {
            const item = value as { value: [number, number, number] };
            return item.value[2].toFixed(2);
          },
        },
      },
    ],
  };

  const scatterOptions: EChartsOption = {
    tooltip: {
      backgroundColor: '#0f2538',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: unknown) => {
        const p = params as { data: { value: [number, number]; name: string } };
        return `
          <div class="p-1 text-xs">
            <div class="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1">${p.data.name}</div>
            <div>${NAMES[selectedPair?.x as Metric]?.label || selectedPair?.x}: <strong class="text-white font-mono">${p.data.value[0]} ${NAMES[selectedPair?.x as Metric]?.unit || ''}</strong></div>
            <div>${NAMES[selectedPair?.y as Metric]?.label || selectedPair?.y}: <strong class="text-white font-mono">${p.data.value[1]} ${NAMES[selectedPair?.y as Metric]?.unit || ''}</strong></div>
          </div>
        `;
      },
    },
    grid: { left: '8%', right: '5%', top: '10%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value',
      name: selectedPair ? `${NAMES[selectedPair.x].label} (${NAMES[selectedPair.x].unit})` : '',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: selectedPair ? `${NAMES[selectedPair.y].label} (${NAMES[selectedPair.y].unit})` : '',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        type: 'scatter',
        data: points.map((point) => {
          const t = formatUtcAndHst(point.observed_at);
          return {
            value: [point.x, point.y],
            name: `${t.utc} | ${t.hst}`,
          };
        }),
        symbolSize: 6,
        itemStyle: { color: '#38bdf8', opacity: 0.75 },
      },
    ],
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER */}
      <header className="rounded-xl border border-[#28516a] bg-[#102d43] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <BarChart2 size={16} />
              <span>Phân tích thống kê quan hệ biến số · Trạm NOAA 51201</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold">Ma trận tương quan &amp; Phân tán quan trắc</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Khám phá mức độ tương quan tuyến tính (Pearson) và đơn điệu phi tham số (Spearman) giữa các đại lượng khí tượng hải văn thực tế trong 30 ngày gần nhất (tập Silver đã qua kiểm định QC valid).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3.5 py-2 text-sm text-cyan-200 transition hover:bg-cyan-900/50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới dữ liệu
          </button>
        </div>

        {sample && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 border-t border-slate-700/60 pt-3">
            <span>
              Mẫu phân tích: <strong className="text-white font-mono">{sample.rows.length.toLocaleString('vi-VN')}</strong> bản ghi QC valid
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Khoảng thời gian: <strong className="text-white">{formatUtcAndHst(sample.first_at).utc}</strong> → <strong className="text-white">{formatUtcAndHst(sample.last_at).utc}</strong>
            </span>
            {sample.truncated && (
              <span className="text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded text-[11px]">
                Đạt giới hạn phân tích 5.000 mẫu gần nhất
              </span>
            )}
          </div>
        )}
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-4 text-sm text-rose-200">
          Không thể tính toán ma trận tương quan: {error}
        </div>
      )}

      {loading && (
        <div role="status" className="py-16 text-center text-slate-400">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mb-3" />
          <div className="text-xs font-mono">Đang tổng hợp dữ liệu và tính toán hệ số tương quan từ Backend...</div>
        </div>
      )}

      {!loading && sample && (
        <>
          {/* METHOD SELECTOR & LEGEND */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Thuật toán đo tương quan:</span>
              <button
                type="button"
                onClick={() => setMethod('pearson')}
                aria-pressed={method === 'pearson'}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  method === 'pearson'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm'
                    : 'border-slate-700 bg-[#0f2538] text-slate-400 hover:text-slate-200'
                }`}
              >
                Hệ số Pearson (r) · Tuyến tính
              </button>
              <button
                type="button"
                onClick={() => setMethod('spearman')}
                aria-pressed={method === 'spearman'}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  method === 'spearman'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm'
                    : 'border-slate-700 bg-[#0f2538] text-slate-400 hover:text-slate-200'
                }`}
              >
                Hệ số Spearman (ρ) · Thứ hạng phi tham số
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Tương quan thuận (+1)
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-600 ml-2"></span> Độc lập (0)
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ml-2"></span> Tương quan nghịch (-1)
            </div>
          </div>

          {/* TWO MAIN COLUMNS: HEATMAP & SCATTER */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* HEATMAP */}
            <section className="rounded-xl border border-slate-700 bg-[#0f2538] p-5 lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Ma trận hệ số {method === 'pearson' ? 'Pearson (r)' : 'Spearman (ρ)'}
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">5 chỉ số khí tượng hải văn</span>
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Nhấp vào ô bất kỳ để phóng to biểu đồ phân tán điểm (Scatter Plot) giữa 2 biến tương ứng.
                </p>

                {heatmapData.length ? (
                  <div className="mt-3">
                    <EChart
                      options={heatmapOptions}
                      height={370}
                      onEvents={{
                        click: (params: unknown) => {
                          const p = params as { value: [number, number, number] };
                          const x = METRICS[p.value[1]];
                          const y = METRICS[p.value[0]];
                          if (x !== y) setSelectedPair({ x, y });
                        },
                      }}
                    />
                  </div>
                ) : (
                  <p role="alert" className="mt-8 text-center text-sm text-amber-200">
                    Không đủ dữ liệu cặp biến để tính hệ số tương quan.
                  </p>
                )}
              </div>

              {/* EMPTY CELL NOTICE */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-300">Lưu ý về ô trống:</span> Ô bị bỏ trống xuất hiện khi cặp dữ liệu bị khuyết tại cùng thời điểm quan trắc, hoặc giá trị của biến không thay đổi (phương sai bằng 0). Hướng sóng MWD là biến góc tuần hoàn (0°–360°) nên không áp dụng tương quan tuyến tính đại số.
              </div>
            </section>

            {/* SCATTER PLOT */}
            <section className="rounded-xl border border-slate-700 bg-[#0f2538] p-5 lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Activity size={16} className="text-sky-400" />
                    Biểu đồ phân tán quan trắc (Scatter)
                  </h2>
                  {selectedPair && (
                    <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                      {selectedPair.x} ↔ {selectedPair.y}
                    </span>
                  )}
                </div>

                {selectedPair && selectedCell && selectedCell.coefficient !== null ? (
                  <>
                    <div className="mt-3 rounded-lg bg-[#0a1a27] p-3 text-xs border border-slate-700">
                      <div className="font-semibold text-slate-200">
                        {NAMES[selectedPair.x].label} ↔ {NAMES[selectedPair.y].label}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-slate-300">
                        <span>Hệ số {method === 'pearson' ? 'Pearson r' : 'Spearman ρ'}: <strong className="text-cyan-300 font-mono">{selectedCell.coefficient.toFixed(3)}</strong></span>
                        <span>Số cặp quan trắc: <strong className="text-white font-mono">{selectedCell.paired_count.toLocaleString('vi-VN')}</strong></span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <EChart options={scatterOptions} height={310} />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400 leading-normal">
                      Mỗi điểm đại diện cho một thời điểm quan trắc có đủ cả 2 chỉ số. Tương quan thống kê không đồng nghĩa với quan hệ nhân quả.
                    </p>
                  </>
                ) : (
                  <p className="mt-8 text-center text-sm text-amber-200">
                    Chưa chọn cặp biến hoặc cặp biến chưa đủ dữ liệu để vẽ biểu đồ phân tán.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* EXPLANATORY CARDS */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-[#0f2538] p-4 text-xs leading-relaxed text-slate-300">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-2">
                <HelpCircle size={15} className="text-cyan-400" />
                Giải thích các chỉ số khí tượng hải văn
              </h3>
              <ul className="space-y-1.5">
                {METRICS.map((m) => (
                  <li key={m} className="flex items-start gap-2">
                    <strong className="text-cyan-200 font-mono shrink-0">{m} ({NAMES[m].unit}):</strong>
                    <span>{NAMES[m].label} — {NAMES[m].desc}.</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-[#09283b] p-4 text-xs leading-relaxed text-cyan-200">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-2">
                <Info size={15} className="text-cyan-400" />
                Nguyên tắc xử lý dữ liệu và tính toán
              </h3>
              <p>
                Hệ số tương quan được tính toán trực tiếp trên từng cặp quan trắc hợp lệ tại cùng mốc thời gian UTC từ tầng dữ liệu Silver. Biến thiếu được loại bỏ theo từng cặp riêng (pairwise deletion). NOAA không cung cấp giá trị dự đoán, do đó các hệ số phản ánh hoàn toàn tính chất tự nhiên của sóng biển và vi khí hậu tại Vịnh Waimea.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
