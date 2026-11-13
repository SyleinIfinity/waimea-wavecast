import { useState, useEffect } from 'react';
import { getClusteringSummary } from '../../api/client';
import type { ClusteringSummary } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { Calendar as CalendarIcon, Compass } from 'lucide-react';
import type { EChartsOption } from 'echarts';

export default function ClusteringPage() {
  const [summary, setSummary] = useState<ClusteringSummary | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClusteringSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-400 border-t-transparent mb-3"></div>
        <div className="text-xs font-mono">Đang tải phân cụm chế độ khí hậu K-means...</div>
      </div>
    );
  }

  const { centroids, assignments, silhouette_score, davies_bouldin_index, k } = summary;

  const radarIndicators = centroids[0].features.map((f) => ({
    name: f.label,
    min: -2,
    max: 2.5,
  }));

  const radarSeriesData = centroids.map((c) => ({
    name: c.cluster_label,
    value: c.features.map((f) => f.z_score),
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
      data: centroids.map((c) => c.cluster_label),
      textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'sans-serif' },
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
      axisName: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
    },
    series: [
      {
        name: 'Tâm cụm đặc trưng khí hậu (Z-score)',
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
        return `<div class="p-1 text-xs font-mono">
          <div class="font-semibold text-slate-200 pb-1 mb-1 border-b border-slate-700/60">${item.date_hst} (HST)</div>
          <div>Chế độ: <strong style="color:${centroids[item.cluster_id].color}">${item.cluster_label}</strong></div>
          <div>Độ cao sóng: <strong class="text-white tabular-nums">${item.wave_height_median_m.toFixed(2)} m</strong></div>
          <div>Chu kỳ sóng: <strong class="text-white tabular-nums">${item.dominant_period_mean_s.toFixed(1)} s</strong></div>
          <div class="text-slate-500 text-[10px] mt-0.5">Khoảng cách tới tâm: ${item.distance_to_centroid}</div>
        </div>`;
      },
    },
    grid: { left: '2%', right: '2%', bottom: '4%', top: '30px', containLabel: true },
    xAxis: {
      type: 'category',
      data: timelineDates,
      axisLine: { lineStyle: { color: '#1e2838' } },
      axisLabel: { color: '#64748b', fontSize: 10, rotate: 30, fontFamily: 'monospace' },
    },
    yAxis: {
      type: 'value',
      name: 'Độ cao sóng WVHT (m)',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#162030' } },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
    },
    series: [
      {
        name: 'Độ cao sóng theo cụm khí hậu',
        type: 'bar',
        barMaxWidth: 12,
        data: assignments.map((a) => ({
          value: a.wave_height_median_m,
          itemStyle: { color: centroids[a.cluster_id].color },
        })),
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 font-medium mb-1">
            <span>S06</span>
            <span className="text-slate-600">/</span>
            <span>Clustering</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Gom cụm các chế độ sóng &amp; khí hậu biển (K-means)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Phân nhóm tự động các ngày quan sát theo đặc tính vi khí hậu (độ cao sóng, chu kỳ, nhiệt độ mặt biển) tại trạm phao Waimea.
          </p>
        </div>

        {/* METRICS BADGES */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono self-start sm:self-auto">
          <div>
            <span className="text-slate-500 text-[10px]">Silhouette:</span>
            <span className="ml-1.5 text-slate-100 font-medium tabular-nums">{silhouette_score}</span>
          </div>
          <div className="h-3 w-px bg-slate-800"></div>
          <div>
            <span className="text-slate-500 text-[10px]">Davies-Bouldin:</span>
            <span className="ml-1.5 text-slate-100 font-medium tabular-nums">{davies_bouldin_index}</span>
          </div>
          <div className="h-3 w-px bg-slate-800"></div>
          <div>
            <span className="text-slate-500 text-[10px]">Số cụm:</span>
            <span className="ml-1.5 text-slate-100 font-medium tabular-nums">{k}</span>
          </div>
        </div>
      </div>

      {/* 3 CLUSTERS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {centroids.map((c) => (
          <div
            key={c.cluster_id}
            onClick={() => setSelectedCluster(selectedCluster === c.cluster_id ? null : c.cluster_id)}
            className={`cursor-pointer rounded-lg p-5 border transition-colors ${
              selectedCluster === c.cluster_id
                ? 'bg-[#111726] border-sky-500'
                : 'bg-[#0f1520] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono font-medium flex items-center gap-2" style={{ color: c.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></span>
                Chế độ {c.cluster_id}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                {c.percentage}% ({c.sample_count} ngày)
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-xs font-semibold text-slate-100">{c.cluster_label}</h3>
              <div className="mt-3 space-y-1.5 text-xs font-mono">
                {c.features.map((f) => (
                  <div key={f.feature_name} className="flex justify-between items-center text-slate-400 text-[11px]">
                    <span>{f.label}:</span>
                    <span className="text-slate-200 tabular-nums">
                      {f.original_value} {f.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TWO VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* RADAR CENTROID (5 COLS) */}
        <div className="lg:col-span-5 p-5 rounded-lg bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-800 mb-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                Đặc trưng tâm cụm khí hậu (Centroid Profile)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Các chỉ số đã được chuẩn hóa Z-score để so sánh tương đối giữa các biến độ cao sóng, chu kỳ và nhiệt độ.
              </p>
            </div>

            <EChart options={radarOptions} height={320} />
          </div>
        </div>

        {/* TIMELINE DISTRIBUTION (7 COLS) */}
        <div className="lg:col-span-7 p-5 rounded-lg bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
              <div>
                <h2 className="text-xs font-medium uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  Chuỗi thời gian phân cụm các ngày quan sát (HST)
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Phân loại từng ngày vào chế độ khí hậu tương ứng qua thuật toán K-means.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-[10px] font-mono">
                {centroids.map((c) => (
                  <span key={c.cluster_id} className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></span>
                    Chế độ {c.cluster_id}
                  </span>
                ))}
              </div>
            </div>

            <EChart options={timelineOptions} height={320} />
          </div>
        </div>
      </div>
    </div>
  );
}
