import { useState, useEffect } from 'react';
import { getClusteringSummary } from '../../api/client';
import type { ClusteringSummary } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { Layers, PieChart, Calendar as CalendarIcon, Info, Compass } from 'lucide-react';
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
      <div className="p-8 text-center text-cyan-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
        <p>Đang tải kết quả gom cụm K-means từ cơ sở dữ liệu Gold...</p>
      </div>
    );
  }

  const { centroids, assignments, silhouette_score, davies_bouldin_index, k } = summary;

  // Cấu hình biểu đồ Radar: Centroid Profile (Z-Score chuẩn hóa)
  const radarIndicators = centroids[0].features.map((f) => ({
    name: f.label,
    min: -2,
    max: 2.5,
  }));

  const radarSeriesData = centroids.map((c) => ({
    name: c.cluster_label,
    value: c.features.map((f) => f.z_score),
    itemStyle: { color: c.color },
    areaStyle: { opacity: 0.25 },
  }));

  const radarOptions: EChartsOption = {
    tooltip: {
      backgroundColor: '#0c2438',
      borderColor: '#2b5268',
      textStyle: { color: '#e6f3ff' },
    },
    legend: {
      data: centroids.map((c) => c.cluster_label),
      textStyle: { color: '#adc7d9', fontSize: 11 },
      bottom: 0,
      orient: 'horizontal',
    },
    radar: {
      indicator: radarIndicators,
      shape: 'polygon',
      splitArea: {
        show: true,
        areaStyle: { color: ['#0b2438', '#102d44', '#153852'] },
      },
      axisLine: { lineStyle: { color: '#2b5268' } },
      splitLine: { lineStyle: { color: '#2b5268' } },
      axisName: { color: '#9fbcd0', fontWeight: 'bold' },
    },
    series: [
      {
        name: 'Tâm cụm đặc trưng (Z-score)',
        type: 'radar',
        data: radarSeriesData,
      },
    ],
  };

  // Cấu hình Timeline Scatter/Bar: Phân cụm các ngày gần đây
  const timelineDates = assignments.map((a) => a.date_hst);
  const timelineHeights = assignments.map((a) => a.wave_height_median_m);

  const timelineOptions: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0c2438',
      borderColor: '#2b5268',
      textStyle: { color: '#e6f3ff' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ dataIndex: number }>)[0];
        const item = assignments[p.dataIndex];
        return `<div class="p-1 text-xs">
          <div class="font-bold text-white border-b border-gray-600 pb-1 mb-1">${item.date_hst} (HST)</div>
          <div>Cụm: <strong style="color:${centroids[item.cluster_id].color}">${item.cluster_label}</strong></div>
          <div>Độ cao sóng trung vị: <strong>${item.wave_height_median_m.toFixed(2)} m</strong></div>
          <div>Chu kỳ sóng trội: <strong>${item.dominant_period_mean_s.toFixed(1)} s</strong></div>
          <div class="text-gray-400">Khoảng cách tới tâm: <strong>${item.distance_to_centroid}</strong></div>
        </div>`;
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true },
    xAxis: {
      type: 'category',
      data: timelineDates,
      axisLine: { lineStyle: { color: '#2b5268' } },
      axisLabel: { color: '#9fbcd0', fontSize: 10, rotate: 35 },
    },
    yAxis: {
      type: 'value',
      name: 'Độ cao sóng WVHT (m)',
      nameTextStyle: { color: '#9fbcd0' },
      splitLine: { lineStyle: { color: '#163850' } },
      axisLabel: { color: '#9fbcd0' },
    },
    series: [
      {
        name: 'Độ cao sóng theo cụm',
        type: 'bar',
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
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
              <Layers className="w-4 h-4" />
              S06 · Khai phá dữ liệu không giám sát (Clustering)
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Gom cụm các chế độ sóng biển (K-means)</h1>
            <p className="text-sm text-[#adc7d9] mt-1">
              Phân nhóm tự động các ngày quan sát theo đặc tính thủy văn (độ cao sóng, chu kỳ, nhiệt độ) tại vịnh Waimea.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#0b2438] px-4 py-2 rounded-lg border border-[#244b63] text-xs">
            <div>
              <div className="text-gray-400">Silhouette Score:</div>
              <div className="text-base font-extrabold text-emerald-400">{silhouette_score}</div>
            </div>
            <div className="h-6 w-px bg-gray-700"></div>
            <div>
              <div className="text-gray-400">Davies-Bouldin:</div>
              <div className="text-base font-extrabold text-cyan-300">{davies_bouldin_index}</div>
            </div>
            <div className="h-6 w-px bg-gray-700"></div>
            <div>
              <div className="text-gray-400">Số cụm k:</div>
              <div className="text-base font-extrabold text-white">{k} cụm</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 CLUSTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {centroids.map((c) => (
          <div
            key={c.cluster_id}
            onClick={() => setSelectedCluster(selectedCluster === c.cluster_id ? null : c.cluster_id)}
            className={`cursor-pointer rounded-xl p-5 border transition-all ${
              selectedCluster === c.cluster_id
                ? 'bg-[#153e5e] border-cyan-400 shadow-lg'
                : 'bg-[#102d44] border-[#2b5268] hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#244b63]">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: c.color }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                Cụm {c.cluster_id}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#081f33] text-gray-300">
                {c.percentage}% ({c.sample_count} ngày)
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-sm font-bold text-white">{c.cluster_label}</h3>
              <div className="mt-4 space-y-2 text-xs">
                {c.features.map((f) => (
                  <div key={f.feature_name} className="flex justify-between items-center text-gray-300">
                    <span className="text-gray-400">{f.label}:</span>
                    <strong className="text-white">
                      {f.original_value} {f.unit}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TWO VISUALIZATIONS: RADAR CENTROIDS + TIMELINE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RADAR CENTROID PROFILE (5 COLS) */}
        <div className="lg:col-span-5 bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Đặc trưng tâm cụm (Centroid Profile)
            </h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Giá trị đặc trưng đã được chuẩn hóa (Z-score) để so sánh tương đối giữa các thang đo khác nhau.
          </p>

          <EChart options={radarOptions} height={340} />
        </div>

        {/* TIMELINE ASSIGNMENTS (7 COLS) */}
        <div className="lg:col-span-7 bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              Lịch sử phân cụm các ngày quan sát (HST)
            </h2>
            <div className="flex items-center gap-3 text-xs">
              {centroids.map((c) => (
                <span key={c.cluster_id} className="flex items-center gap-1.5 text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                  Cụm {c.cluster_id}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Màu sắc thể hiện cụm được mô hình K-means gán cho từng ngày dựa trên vector đặc trưng.
          </p>

          <EChart options={timelineOptions} height={340} />
        </div>
      </div>
    </div>
  );
}

