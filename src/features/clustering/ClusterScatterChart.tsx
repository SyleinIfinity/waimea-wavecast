import { useId } from 'react';
import { ChartScatter } from 'lucide-react';
import type { EChartsOption, ScatterSeriesOption } from 'echarts';
import type { ClusteringSummary } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { useClusteringSummary } from './useClusteringSummary';

export function ClusterScatterChart({ summary, error }: { summary: ClusteringSummary | null; error?: string | null }) {
  const titleId = useId();
  const { centroids = [], assignments = [] } = summary ?? {};
  const scatterSeries: ScatterSeriesOption[] = centroids.map(cluster => ({
    name: `Nhóm ${cluster.cluster_id}`,
    type: 'scatter',
    symbolSize: 10,
    itemStyle: { color: cluster.color, opacity: 0.75 },
    data: assignments.flatMap(assignment => {
      const { cluster_id, date_hst, dominant_period_mean_s, wave_height_median_m } = assignment;
      if (cluster_id !== cluster.cluster_id || dominant_period_mean_s == null || wave_height_median_m == null) return [];
      return [{ name: date_hst, value: [dominant_period_mean_s, wave_height_median_m] }];
    }),
  }));
  const scatterCount = scatterSeries.reduce((count, series) => count + (series.data?.length ?? 0), 0);
  const scatterOptions: EChartsOption = {
    grid: { left: 64, right: 24, top: 24, bottom: 80 },
    legend: { bottom: 4, textStyle: { color: '#cbd5e1' }, icon: 'circle' },
    xAxis: {
      type: 'value', scale: true, name: 'Chu kỳ sóng trội trung bình (s)',
      nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: '#cbd5e1' },
    },
    yAxis: {
      type: 'value', scale: true, name: 'Độ cao sóng trung vị (m)',
      nameLocation: 'middle', nameGap: 42, nameTextStyle: { color: '#cbd5e1' },
      splitLine: { lineStyle: { color: '#1e2838' } },
    },
    tooltip: {
      trigger: 'item', renderMode: 'richText', confine: true,
      formatter: (params: unknown) => {
        const { name, seriesName, value: [period, height] } = params as { name: string; seriesName: string; value: [number, number] };
        return `${name} (Hawaii) · ${seriesName}\nChu kỳ sóng ${period.toFixed(1)} s\nĐộ cao sóng ${height.toFixed(2)} m`;
      },
    },
    series: scatterSeries,
  };

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-slate-800 bg-[#0f1520] p-5">
      <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <ChartScatter className="w-4 h-4 text-cyan-400" /> Biểu đồ phân tán theo cụm (K-Means)
      </h2>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-200">Không thể tải biểu đồ phân cụm. {error}</p>
      ) : !summary ? (
        <p role="status" className="mt-3 text-sm text-slate-400">Đang tải dữ liệu phân cụm…</p>
      ) : scatterCount > 0 ? (
        <>
          <p className="mt-1 text-xs text-slate-400">Mỗi điểm là một ngày đã quan trắc theo giờ Hawaii. Màu thể hiện cụm K-Means. Hiển thị {scatterCount}/{assignments.length} ngày.</p>
          <EChart options={scatterOptions} height={350} />
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Chưa có ngày phân cụm đủ cả độ cao sóng và chu kỳ sóng để vẽ.</p>
      )}
    </section>
  );
}

export function ClusterScatterPanel({ refreshKey }: { refreshKey: number }) {
  const { summary, error } = useClusteringSummary(refreshKey);
  return <ClusterScatterChart summary={summary} error={error} />;
}
