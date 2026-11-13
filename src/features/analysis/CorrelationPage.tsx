import { useState, useEffect } from 'react';
import { getCorrelationMatrix, getScatterData } from '../../api/client';
import type { CorrelationMatrix, ScatterPoint } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { Grid, Activity, Info, Sparkles } from 'lucide-react';
import type { EChartsOption } from 'echarts';

const VARIABLE_NAMES: Record<string, string> = {
  WVHT: 'Độ cao sóng (WVHT)',
  DPD: 'Chu kỳ sóng trội (DPD)',
  APD: 'Chu kỳ sóng trung bình (APD)',
  MWD: 'Hướng sóng chính (MWD)',
  WTMP: 'Nhiệt độ nước biển (WTMP)',
};

export default function CorrelationPage() {
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [matrixData, setMatrixData] = useState<CorrelationMatrix | null>(null);
  const [selectedPair, setSelectedPair] = useState<{ var1: string; var2: string; coeff: number } | null>(null);
  const [scatterPoints, setScatterPoints] = useState<ScatterPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCorrelationMatrix(method)
      .then((data) => {
        setMatrixData(data);
        if (!selectedPair) {
          setSelectedPair({ var1: 'WVHT', var2: 'DPD', coeff: 0.68 });
        }
      })
      .finally(() => setLoading(false));
  }, [method]);

  useEffect(() => {
    if (selectedPair) {
      getScatterData(selectedPair.var1, selectedPair.var2).then(setScatterPoints);
    }
  }, [selectedPair]);

  if (loading || !matrixData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-cyan-400 border-t-transparent mb-3"></div>
        <div className="text-xs font-mono">Đang tính ma trận tương quan đa biến...</div>
      </div>
    );
  }

  const { variables, matrix } = matrixData;

  const heatmapData: Array<[number, number, number]> = [];
  matrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      heatmapData.push([j, i, cell.coefficient ?? 0]);
    });
  });

  const heatmapOptions: EChartsOption = {
    tooltip: {
      position: 'top',
      backgroundColor: '#07121c',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: { color: '#f1f5f9', fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number] };
        const v1 = variables[p.value[1]];
        const v2 = variables[p.value[0]];
        const cell = matrix[p.value[1]][p.value[0]];
        return `<div class="p-1 font-mono text-xs">
          <div class="font-bold text-cyan-400 pb-1 mb-1 border-b border-white/[0.08]">${v1} ↔ ${v2}</div>
          <div>Hệ số r: <strong class="text-white">${cell.coefficient?.toFixed(2) ?? 'N/A'}</strong></div>
          <div class="text-slate-400 text-[11px] mt-0.5">Số mẫu cặp: ${cell.paired_sample_count.toLocaleString()}</div>
        </div>`;
      },
    },
    grid: { left: '8%', right: '4%', bottom: '18%', top: '8%' },
    xAxis: {
      type: 'category',
      data: variables,
      splitArea: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 },
    },
    yAxis: {
      type: 'category',
      data: variables,
      splitArea: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#e11d48', '#1e293b', '#06b6d4', '#3b82f6'],
      },
      textStyle: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
    },
    series: [
      {
        name: 'Hệ số tương quan',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: 11,
          formatter: (p: unknown) => {
            const item = p as { value: [number, number, number] };
            return item.value[2].toFixed(2);
          },
        },
      },
    ],
  };

  const scatterOptions: EChartsOption = {
    tooltip: {
      backgroundColor: '#07121c',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#f1f5f9' },
      formatter: (p: unknown) => {
        const pt = p as { value: [number, number] };
        return `<div class="text-xs font-mono p-1">
          <div>${selectedPair?.var1}: <strong class="text-white">${pt.value[0]}</strong></div>
          <div>${selectedPair?.var2}: <strong class="text-cyan-400">${pt.value[1]}</strong></div>
        </div>`;
      },
    },
    grid: { left: '4%', right: '4%', bottom: '8%', top: '12%', containLabel: true },
    xAxis: {
      type: 'value',
      name: selectedPair?.var1,
      nameTextStyle: { color: '#64748b', fontFamily: 'monospace', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      axisLabel: { color: '#64748b', fontFamily: 'monospace', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: selectedPair?.var2,
      nameTextStyle: { color: '#64748b', fontFamily: 'monospace', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      axisLabel: { color: '#64748b', fontFamily: 'monospace', fontSize: 10 },
    },
    series: [
      {
        name: 'Quan sát',
        type: 'scatter',
        data: scatterPoints.map((s) => [s.x, s.y]),
        itemStyle: { color: '#06b6d4' },
        symbolSize: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            S05 · Thám hiểm Tương quan Hải dương
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ma trận tương quan &amp; Phân tán (Correlations)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Phân tích mối liên hệ đa biến giữa độ cao sóng, chu kỳ sóng trội và nhiệt độ nước biển tại trạm 51201.
          </p>
        </div>

        {/* SEGMENTED CONTROL */}
        <div className="inline-flex items-center p-1 rounded-lg bg-[#08121b] border border-white/[0.08] text-xs font-mono self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMethod('pearson')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              method === 'pearson'
                ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pearson (Tuyến tính)
          </button>
          <button
            type="button"
            onClick={() => setMethod('spearman')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              method === 'spearman'
                ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spearman (Thứ hạng)
          </button>
        </div>
      </div>

      {/* MAIN TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* HEATMAP (7 COLS) */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-[#08121b] border border-white/[0.07] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Ma trận tương quan đối xứng ({method.toUpperCase()})
              </h2>
              <span className="text-[11px] font-mono text-slate-500">Click ô để mở Scatter</span>
            </div>

            <EChart
              options={heatmapOptions}
              height={360}
              onEvents={{
                click: (params: unknown) => {
                  const p = params as { value: [number, number, number] };
                  const v1 = variables[p.value[1]];
                  const v2 = variables[p.value[0]];
                  setSelectedPair({ var1: v1, var2: v2, coeff: p.value[2] });
                },
              }}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Xanh: Tương quan dương ($r &gt; 0.6$). Đỏ: Nghịch biến ($r &lt; -0.3$).</span>
          </div>
        </div>

        {/* SCATTER DETAIL (5 COLS) */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-[#08121b] border border-white/[0.07] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Phân tán cặp biến (Scatter Plot)
              </span>
              {selectedPair && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300">
                  r = {selectedPair.coeff.toFixed(2)}
                </span>
              )}
            </div>

            {selectedPair ? (
              <div className="mt-4">
                <div className="text-xs font-mono font-medium text-slate-300">
                  {VARIABLE_NAMES[selectedPair.var1] || selectedPair.var1} ↔ {VARIABLE_NAMES[selectedPair.var2] || selectedPair.var2}
                </div>

                <div className="mt-2">
                  <EChart options={scatterOptions} height={260} />
                </div>

                <div className="mt-4 p-3.5 rounded-lg bg-[#050c14] border border-white/[0.05] text-xs text-slate-300 space-y-1.5">
                  <div className="font-semibold text-cyan-300 text-[11px] font-mono uppercase tracking-wider">
                    Nhận định vật lý hải dương:
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {selectedPair.coeff > 0.6
                      ? `Tương quan đồng biến mạnh: Khi ${selectedPair.var1} tăng thì ${selectedPair.var2} tăng rõ rệt (phù hợp với tính chất sóng Swell Bắc Thái Bình Dương tại Waimea).`
                      : selectedPair.coeff < -0.3
                      ? `Tương quan nghịch biến: Khi ${selectedPair.var1} tăng thì ${selectedPair.var2} giảm (mùa đông sóng cao thường đi kèm nhiệt độ biển hạ nhiệt).`
                      : `Mối tương quan tuyến tính yếu giữa ${selectedPair.var1} và ${selectedPair.var2}.`}
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    *Tương quan thống kê không đồng nghĩa với quan hệ nguyên nhân - kết quả.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs font-mono">
                Chọn một ô trong ma trận để xem phân tán.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
