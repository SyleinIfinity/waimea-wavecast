import { useState, useEffect } from 'react';
import { getCorrelationMatrix, getScatterData } from '../../api/client';
import type { CorrelationMatrix, ScatterPoint } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { Grid, Sparkles, X, Info, Activity } from 'lucide-react';
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
      <div className="p-8 text-center text-cyan-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
        <p>Đang tính toán ma trận tương quan giữa các biến hải dương...</p>
      </div>
    );
  }

  const { variables, matrix } = matrixData;

  // Cấu hình ECharts Heatmap
  const heatmapData: Array<[number, number, number]> = [];
  matrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      heatmapData.push([j, i, cell.coefficient ?? 0]);
    });
  });

  const heatmapOptions: EChartsOption = {
    tooltip: {
      position: 'top',
      backgroundColor: '#0c2438',
      borderColor: '#2b5268',
      textStyle: { color: '#e6f3ff' },
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number] };
        const v1 = variables[p.value[1]];
        const v2 = variables[p.value[0]];
        const cell = matrix[p.value[1]][p.value[0]];
        return `<div class="p-1 text-xs">
          <div class="font-bold text-cyan-300">${v1} ↔ ${v2}</div>
          <div class="mt-1">Hệ số r: <strong>${cell.coefficient?.toFixed(2) ?? 'N/A'}</strong></div>
          <div class="text-gray-400">Số mẫu cặp: <strong>${cell.paired_sample_count.toLocaleString()}</strong></div>
          <div class="text-[10px] text-gray-500 mt-1">Click để xem phân tán (Scatter)</div>
        </div>`;
      },
    },
    grid: { left: '10%', right: '8%', bottom: '15%', top: '10%' },
    xAxis: {
      type: 'category',
      data: variables,
      splitArea: { show: true },
      axisLabel: { color: '#adc7d9', fontWeight: 'bold' },
    },
    yAxis: {
      type: 'category',
      data: variables,
      splitArea: { show: true },
      axisLabel: { color: '#adc7d9', fontWeight: 'bold' },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#ef4444', '#1e293b', '#06b6d4', '#3b82f6'],
      },
      textStyle: { color: '#9fbcd0' },
    },
    series: [
      {
        name: 'Hệ số tương quan',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#ffffff',
          formatter: (p: unknown) => {
            const item = p as { value: [number, number, number] };
            return item.value[2].toFixed(2);
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // Cấu hình Scatter Plot cho cặp biến đang chọn
  const scatterOptions: EChartsOption = {
    tooltip: {
      backgroundColor: '#0c2438',
      borderColor: '#2b5268',
      textStyle: { color: '#e6f3ff' },
      formatter: (p: unknown) => {
        const pt = p as { value: [number, number] };
        return `<div class="text-xs">
          <div>${selectedPair?.var1}: <strong>${pt.value[0]}</strong></div>
          <div>${selectedPair?.var2}: <strong>${pt.value[1]}</strong></div>
        </div>`;
      },
    },
    grid: { left: '8%', right: '8%', bottom: '10%', top: '12%', containLabel: true },
    xAxis: {
      type: 'value',
      name: selectedPair?.var1,
      nameTextStyle: { color: '#9fbcd0' },
      splitLine: { lineStyle: { color: '#163850' } },
      axisLabel: { color: '#9fbcd0' },
    },
    yAxis: {
      type: 'value',
      name: selectedPair?.var2,
      nameTextStyle: { color: '#9fbcd0' },
      splitLine: { lineStyle: { color: '#163850' } },
      axisLabel: { color: '#9fbcd0' },
    },
    series: [
      {
        name: 'Quan sát',
        type: 'scatter',
        data: scatterPoints.map((s) => [s.x, s.y]),
        itemStyle: { color: '#38bdf8' },
        symbolSize: 8,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
              <Grid className="w-4 h-4" />
              S05 · Thám hiểm Tương quan Hải dương
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Ma trận tương quan & Phân tán (Correlations)</h1>
            <p className="text-sm text-[#adc7d9] mt-1">
              Phân tích mối liên hệ đa biến giữa độ cao sóng, chu kỳ và nhiệt độ biển.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0b2438] p-1.5 rounded-lg border border-[#244b63]">
            <button
              onClick={() => setMethod('pearson')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                method === 'pearson'
                  ? 'bg-cyan-500 text-gray-950 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pearson (Tuyến tính)
            </button>
            <button
              onClick={() => setMethod('spearman')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                method === 'spearman'
                  ? 'bg-cyan-500 text-gray-950 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Spearman (Thứ hạng)
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: HEATMAP + SCATTER DETAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HEATMAP 7 COLS */}
        <div className="lg:col-span-7 bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Ma trận tương quan đối xứng ({method.toUpperCase()})
            </h2>
            <span className="text-xs text-gray-400">Click vào ô để phân tích chi tiết</span>
          </div>

          <EChart
            options={heatmapOptions}
            height={380}
            onEvents={{
              click: (params: unknown) => {
                const p = params as { value: [number, number, number] };
                const v1 = variables[p.value[1]];
                const v2 = variables[p.value[0]];
                setSelectedPair({ var1: v1, var2: v2, coeff: p.value[2] });
              },
            }}
          />

          <div className="mt-4 pt-3 border-t border-[#244b63] flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Màu xanh dương: Tương quan dương mạnh ($r &gt; 0.6$). Màu đỏ: Tương quan âm ($r &lt; -0.3$).</span>
          </div>
        </div>

        {/* SCATTER DETAIL 5 COLS */}
        <div className="lg:col-span-5 bg-[#102d44] border border-[#2b5268] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#244b63]">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                Phân tán chi tiết cặp biến (Scatter Plot)
              </span>
              {selectedPair && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                  r = {selectedPair.coeff.toFixed(2)}
                </span>
              )}
            </div>

            {selectedPair ? (
              <div className="mt-3">
                <div className="text-sm font-semibold text-white">
                  {VARIABLE_NAMES[selectedPair.var1] || selectedPair.var1} ↔ {VARIABLE_NAMES[selectedPair.var2] || selectedPair.var2}
                </div>

                <div className="mt-2">
                  <EChart options={scatterOptions} height={280} />
                </div>

                <div className="mt-3 bg-[#081f33] p-3 rounded-lg border border-[#244b63] text-xs text-gray-300 space-y-1">
                  <div className="font-semibold text-cyan-300">Nhận định khai phá:</div>
                  <p>
                    {selectedPair.coeff > 0.6
                      ? `Mối tương quan đồng biến mạnh: Khi ${selectedPair.var1} tăng thì ${selectedPair.var2} có xu hướng tăng rõ rệt (phù hợp với quy luật vật lý sóng swell Hawaii).`
                      : selectedPair.coeff < -0.3
                      ? `Mối tương quan nghịch biến: Khi ${selectedPair.var1} tăng thì ${selectedPair.var2} giảm (ví dụ: mùa đông sóng cao đi kèm nhiệt độ biển hạ thấp).`
                      : `Mối liên hệ tuyến tính yếu giữa ${selectedPair.var1} và ${selectedPair.var2}.`}
                  </p>
                  <p className="text-[11px] text-gray-400 italic">
                    *Tương quan thống kê không đồng nghĩa với quan hệ nguyên nhân - kết quả.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs">
                Chọn một ô trong ma trận để xem biểu đồ phân tán.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
