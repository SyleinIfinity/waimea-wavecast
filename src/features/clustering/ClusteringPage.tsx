import { useState } from 'react';
import { ClusterScatterChart } from './ClusterScatterChart';
import { useClusteringSummary } from './useClusteringSummary';
import EChart from '../../components/charts/EChart';
import { Calendar as CalendarIcon, Compass, Info, ChevronDown, ChevronUp, Layers, AlertCircle } from 'lucide-react';
import type { EChartsOption } from 'echarts';

export default function ClusteringPage() {
  const { summary, error } = useClusteringSummary();
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-5 text-rose-200">
        Không thể tải dữ liệu phân nhóm sóng: {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-400 border-t-transparent mb-3" />
        <div className="text-xs font-mono">Đang tải phân nhóm điều kiện sóng tự nhiên (K-Means)...</div>
      </div>
    );
  }

  const { centroids, assignments, silhouette_score, davies_bouldin_index, k } = summary;
  const radarIndicators = centroids[0].features.map((f) => ({
    name: f.label,
    min: Math.min(0, ...centroids.map((c) => c.features.find((v) => v.feature_name === f.feature_name)?.original_value ?? 0)) * 1.1,
    max: Math.max(1, ...centroids.map((c) => c.features.find((v) => v.feature_name === f.feature_name)?.original_value ?? 0)) * 1.1,
  }));

  const radarSeriesData = centroids.map((c) => ({
    name: `Nhóm ${c.cluster_id}: ${c.cluster_label}`,
    value: c.features.map((f) => f.original_value),
    itemStyle: { color: c.color },
    areaStyle: { opacity: 0.15 },
  }));

  const radarOptions: EChartsOption = {
    tooltip: {
      backgroundColor: '#0f1520',
      borderColor: '#1e2838',
      textStyle: { color: '#f1f5f9', fontSize: 11 },
    },
    legend: {
      data: centroids.map((c) => `Nhóm ${c.cluster_id}: ${c.cluster_label}`),
      textStyle: { color: '#94a3b8', fontSize: 11 },
      bottom: 0,
      icon: 'circle',
    },
    radar: {
      indicator: radarIndicators,
      shape: 'polygon',
      splitArea: {
        show: true,
        areaStyle: { color: ['#090d14', '#0f1520', '#131b28'] },
      },
      axisLine: { lineStyle: { color: '#1e2838' } },
      splitLine: { lineStyle: { color: '#1e2838' } },
      axisName: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        name: 'Đặc trưng trung bình của nhóm',
        type: 'radar',
        data: radarSeriesData,
      },
    ],
  };

  const timelineDates = assignments.map((a) => a.date_hst);

  const timelineOptions: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f1520',
      borderColor: '#1e2838',
      textStyle: { color: '#f1f5f9' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ dataIndex: number }>)[0];
        const item = assignments[p.dataIndex];
        const cluster = centroids.find((c) => c.cluster_id === item.cluster_id);
        return `<div class="p-1 text-xs">
          <div class="font-semibold text-slate-200 pb-1 mb-1 border-b border-slate-700/60">${item.date_hst} (Giờ Hawaii - HST)</div>
          <div>Nhóm điều kiện sóng: <strong style="color:${cluster?.color ?? '#94a3b8'}">${cluster?.cluster_label ?? `Nhóm ${item.cluster_id}`}</strong></div>
          <div>Độ cao sóng trung vị: <strong class="text-white tabular-nums">${item.wave_height_median_m?.toFixed(2) ?? 'N/A'} m</strong></div>
          <div>Chu kỳ sóng trội: <strong class="text-white tabular-nums">${item.dominant_period_mean_s?.toFixed(1) ?? 'N/A'} s</strong></div>
        </div>`;
      },
    },
    grid: { left: '3%', right: '2%', bottom: '8%', top: '30px', containLabel: true },
    xAxis: {
      type: 'category',
      data: timelineDates,
      axisLine: { lineStyle: { color: '#1e2838' } },
      axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      name: 'Độ cao sóng WVHT (m)',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#162030' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    series: [
      {
        name: 'Độ cao sóng theo nhóm',
        type: 'bar',
        barMaxWidth: 14,
        data: assignments.map((a) => ({
          value: a.wave_height_median_m,
          itemStyle: { color: centroids.find((c) => c.cluster_id === a.cluster_id)?.color ?? '#94a3b8' },
        })),
      },
    ],
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1">
            <Layers className="w-4 h-4" />
            <span>Phân tích cụm học máy không giám sát · Trạm NOAA 51201</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            Phân nhóm điều kiện sóng tự nhiên (K-Means)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            K-Means gom nhóm các ngày dựa trên lịch sử độ cao và chu kỳ sóng, hướng sóng, mùa trong năm và độ đầy đủ của quan trắc.
          </p>
        </div>

        {/* METRICS BADGES */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs self-start sm:self-auto">
          <div>
            <span className="text-slate-400 text-[11px]">Số nhóm:</span>
            <span className="ml-1.5 text-cyan-300 font-bold font-mono text-sm">{k}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 text-[11px]">Tổng số ngày:</span>
            <span className="ml-1.5 text-white font-medium font-mono">{assignments.length} ngày</span>
          </div>
        </div>
      </div>

      {/* SCIENTIFIC DISCLAIMER */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          Các nhóm mô tả điều kiện sóng đã quan trắc. Dùng thông tin cảnh báo chính thức khi quyết định tắm biển hoặc lướt sóng.
        </div>
      </div>

      <ClusterScatterChart summary={summary} />

      {/* CLUSTERS SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {centroids.map((c) => {
          const isSelected = selectedCluster === c.cluster_id;
          return (
            <div
              key={c.cluster_id}
              onClick={() => setSelectedCluster(isSelected ? null : c.cluster_id)}
              className={`cursor-pointer rounded-xl p-5 border transition-all ${
                isSelected
                  ? 'bg-[#111c2e] border-cyan-400 ring-1 ring-cyan-400 shadow-lg'
                  : 'bg-[#0f1520] border-slate-800 hover:border-slate-700 hover:bg-[#131b28]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold flex items-center gap-2" style={{ color: c.color }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  Nhóm điều kiện sóng {c.cluster_id}
                </span>
                <span className="text-[11px] font-mono text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                  {c.percentage}%
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-sm font-semibold text-slate-100">{c.cluster_label}</h3>
                <div className="text-xs text-slate-400 mt-1 mb-3">
                  Số ngày thuộc nhóm: <strong className="text-white font-mono">{c.sample_count}</strong> ngày
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">Đặc trưng của nhóm:</div>
                  {c.features.map((f) => (
                    <div key={f.feature_name} className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>{f.label}:</span>
                      <span className="text-slate-200 font-mono font-medium">
                        {f.original_value} {f.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TWO VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* RADAR CENTROID (5 COLS) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-800 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                Đặc trưng của nhóm điều kiện sóng
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Biểu đồ mạng nhện biểu diễn giá trị trung bình các đặc trưng của từng nhóm.
              </p>
            </div>
            <EChart options={radarOptions} height={320} />
          </div>
        </div>

        {/* TIMELINE DISTRIBUTION (7 COLS) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  Phân bố các ngày theo nhóm điều kiện sóng (HST)
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mỗi cột là độ cao sóng trung vị trong ngày theo múi giờ Hawaii, màu sắc đại diện cho nhóm sóng.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-[11px]">
                {centroids.map((c) => (
                  <span key={c.cluster_id} className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    Nhóm {c.cluster_id}
                  </span>
                ))}
              </div>
            </div>

            <EChart options={timelineOptions} height={320} />
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE TECHNICAL DETAILS (ACCORDION) */}
      <div className="rounded-xl border border-slate-800 bg-[#0f1520] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between p-4 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Chi tiết kỹ thuật (Centroid, Silhouette &amp; Davies-Bouldin Index)</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showTechnicalDetails && (
          <div className="p-5 border-t border-slate-800/80 bg-[#090d14] text-xs text-slate-300 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-[#0f1520] border border-slate-800">
                <div className="text-slate-400 text-[11px] font-medium">Hệ số Silhouette Score</div>
                <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{silhouette_score ?? 'N/A'}</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Đo lường mức độ gắn kết nội cụm so với sự tách biệt ngoại cụm (-1 đến +1). Giá trị dương cao chứng minh các nhóm được phân định rõ ràng.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0f1520] border border-slate-800">
                <div className="text-slate-400 text-[11px] font-medium">Chỉ số Davies-Bouldin Index</div>
                <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{davies_bouldin_index ?? 'N/A'}</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Đánh giá độ tương đồng giữa các cụm. Giá trị càng thấp biểu thị sự phân chia giữa các nhóm càng gọn và độc lập.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
              <p>
                <strong>Quy trình chuẩn hóa:</strong> Dữ liệu quan trắc từ bảng Silver được tổng hợp theo ngày (múi giờ Hawaii HST) và chuẩn hóa theo thang đo Z-score trước khi đưa vào thuật toán K-Means với k = {k}.
              </p>
              <p>
                <strong>Tâm cụm</strong> là trung tâm của nhóm trong không gian đặc trưng đã chuẩn hóa. Biểu đồ phân tán chỉ hiển thị hai trục độ cao và chu kỳ sóng.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
