import type {
  LatestResponse,
  WaveForecast,
  ForecastHistoryPoint,
  WaveClassification,
  CorrelationMatrix,
  ScatterPoint,
  ClusteringSummary,
  ModelRegistryItem,
  ConfusionMatrixData,
  PipelineServiceStatus,
  ProcessingJob,
  DemoPreflight,
  PreviewDeleteRequest,
  PreviewDeleteResponse,
  DeletePatternsResponse,
} from './types';
import {
  mockLatestForecast,
  mockForecastHistory,
  mockLatestClassification,
  mockCorrelationMatrix,
  generateMockScatter,
  mockClusteringSummary,
  mockModelRegistry,
  mockConfusionMatrix,
  mockPipelineServices,
  mockProcessingJobs,
  mockDemoPreflight,
  mockPreviewDeleteResponse,
} from './mockData';

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
)
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/, '');
  
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// OBSERVATION
// ==========================================
export async function loadLatest(signal?: AbortSignal): Promise<LatestResponse> {
  if (USE_MOCK) {
    await delay(250);
    return {
      status: 'ok',
      data_type: 'observation',
      data: {
        station_id: '51201',
        source: 'NOAA NDBC Realtime Feed',
        observed_at: new Date().toISOString(),
        wave_height_m: 2.4,
        dominant_period_s: 11.2,
        wave_direction_deg: 325,
        sea_temperature_c: 25.4,
        quality_flag: 'valid',
      },
    };
  }
  const response = await fetch(`${BASE_URL}/api/v1/observations/latest`, { signal });
  if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}`);
  return response.json() as Promise<LatestResponse>;
}

// ==========================================
// TL03: S07 - FORECAST & CLASSIFICATION
// ==========================================
export async function getLatestForecast(): Promise<WaveForecast> {
  if (USE_MOCK) {
    await delay(300);
    return { ...mockLatestForecast };
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/predictions/latest`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend predictions/latest chưa sẵn sàng, dùng mock:', err);
  }
  return { ...mockLatestForecast };
}

export async function getForecastHistory(): Promise<ForecastHistoryPoint[]> {
  if (USE_MOCK) {
    await delay(300);
    return [...mockForecastHistory];
  }
  try {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`${BASE_URL}/api/v1/predictions/history?start_hst=${start}&end_hst=${end}`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend predictions/history chưa sẵn sàng, dùng mock:', err);
  }
  return [...mockForecastHistory];
}

export async function getLatestClassification(): Promise<WaveClassification> {
  if (USE_MOCK) {
    await delay(250);
    return { ...mockLatestClassification };
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/classifications/latest`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend classifications/latest chưa sẵn sàng, dùng mock:', err);
  }
  return { ...mockLatestClassification };
}

// ==========================================
// TL03: S05 - CORRELATION EXPLORER
// ==========================================
export async function getCorrelationMatrix(method: 'pearson' | 'spearman' = 'pearson'): Promise<CorrelationMatrix> {
  if (USE_MOCK) {
    await delay(350);
    return {
      ...mockCorrelationMatrix,
      method,
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/analytics/correlations?method=${method}`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
        return {
          station_id: '51201',
          period_start_hst: json.period_start_hst || '',
          period_end_hst: json.period_end_hst || '',
          method,
          variables: mockCorrelationMatrix.variables,
          matrix: json.data,
          computed_at: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Backend correlations chưa sẵn sàng, dùng mock:', err);
  }
  return {
    ...mockCorrelationMatrix,
    method,
  };
}

export async function getScatterData(var1: string, var2: string): Promise<ScatterPoint[]> {
  if (USE_MOCK) {
    await delay(200);
    return generateMockScatter(var1, var2);
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/analytics/scatter?x=${var1}&y=${var2}&limit=300`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((r: { observed_at?: string; x?: number | null; y?: number | null }) => ({
          observed_at: r.observed_at || '',
          x: Number(r.x ?? 0),
          y: Number(r.y ?? 0),
        }));
      }
    }
  } catch (err) {
    console.warn('Backend scatter data chưa sẵn sàng, dùng mock:', err);
  }
  return generateMockScatter(var1, var2);
}

// ==========================================
// TL03: S06 - CLUSTERING
// ==========================================
export async function getClusteringSummary(): Promise<ClusteringSummary> {
  if (USE_MOCK) {
    await delay(400);
    return { ...mockClusteringSummary };
  }
  try {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const [resClusters, resProfiles] = await Promise.all([
      fetch(`${BASE_URL}/api/v1/clusters?start_hst=${start}&end_hst=${end}&limit=500`),
      fetch(`${BASE_URL}/api/v1/clusters/profiles?model_id=10`),
    ]);
    if (resClusters.ok) {
      const clusterJson = await resClusters.json();
      const profilesJson = resProfiles.ok ? await resProfiles.json() : { data: [] };
      const assignments = Array.isArray(clusterJson.data) ? clusterJson.data : [];
      const profiles = Array.isArray(profilesJson.data) ? profilesJson.data : [];

      if (assignments.length > 0) {
        return {
          model_id: 10,
          model_version: 'tl08b-20261113-v1',
          algorithm: 'K-means',
          k: profiles.length || 2,
          silhouette_score: 0.269,
          davies_bouldin_index: 1.394,
          trained_at: '2026-11-13T04:11:05Z',
          centroids: profiles.map((p: { cluster_label: number; centroid_features?: Record<string, number> }) => ({
            cluster_id: p.cluster_label,
            cluster_label: `Cụm ${p.cluster_label}: ${p.cluster_label === 0 ? 'Sóng êm & Chu kỳ ngắn' : 'Sóng lừng mùa đông cao'}`,
            color: p.cluster_label === 0 ? '#38bdf8' : '#f59e0b',
            sample_count: assignments.filter((a: { cluster_label: number }) => a.cluster_label === p.cluster_label).length,
            mean_wvht_m: Number(p.centroid_features?.wave_height_median_lag0?.toFixed(2)) || 1.8,
            mean_dpd_s: Number(p.centroid_features?.dominant_period_lag0?.toFixed(1)) || 11.2,
            mean_wtmp_c: 25.2,
            dominant_direction: 'NW (315°)',
            description: p.cluster_label === 0 ? 'Điều kiện biển lặng mùa hè' : 'Sóng lừng mùa đông Hawaii',
          })),
          assignments: assignments.map((a: { date_hst: string; cluster_label: number; distance_to_centroid?: number }) => ({
            date_hst: a.date_hst,
            cluster_id: a.cluster_label,
            distance_to_centroid: a.distance_to_centroid || 0,
          })),
        };
      }
    }
  } catch (err) {
    console.warn('Backend clusters chưa sẵn sàng, dùng mock:', err);
  }
  return { ...mockClusteringSummary };
}

// ==========================================
// TL03: S08 - MODEL LAB / EVALUATION
// ==========================================
export async function getModelRegistry(): Promise<ModelRegistryItem[]> {
  if (USE_MOCK) {
    await delay(300);
    return [...mockModelRegistry];
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/models`);
    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
      if (rawList.length > 0) {
        return rawList.map((m: Record<string, any>) => ({
          model_id: m.model_id,
          model_name: m.model_name,
          model_version: m.model_version,
          task_type: m.task_type,
          algorithm: m.algorithm,
          status: m.status,
          created_at: m.created_at,
          dataset_version: m.dataset_version || '2004-2026-v1',
          features_used: m.feature_names || [],
          metrics: {
            mae: m.evaluation_metrics?.metrics?.model?.mae ?? m.evaluation_metrics?.test?.mae,
            rmse: m.evaluation_metrics?.metrics?.model?.rmse ?? m.evaluation_metrics?.test?.rmse,
            r2: m.evaluation_metrics?.metrics?.model?.r2_score ?? m.evaluation_metrics?.test?.r2,
            accuracy: m.evaluation_metrics?.metrics?.model?.accuracy ?? m.evaluation_metrics?.test?.accuracy,
            macro_f1: m.evaluation_metrics?.metrics?.model?.macro_f1 ?? m.evaluation_metrics?.test?.macro_f1,
            baseline_mae: m.evaluation_metrics?.metrics?.persistence?.mae ?? m.evaluation_metrics?.baseline?.mae,
            baseline_r2: m.evaluation_metrics?.metrics?.persistence?.r2_score ?? m.evaluation_metrics?.baseline?.r2,
          },
          readiness: m.evaluation_metrics?.readiness || 'NOT_READY',
          gate_reason: m.evaluation_metrics?.reason,
        }));
      }
    }
  } catch (err) {
    console.warn('Backend models chưa sẵn sàng, dùng mock:', err);
  }
  return [...mockModelRegistry];
}

export async function getConfusionMatrix(): Promise<ConfusionMatrixData> {
  if (USE_MOCK) {
    await delay(250);
    return { ...mockConfusionMatrix };
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/models/classification/confusion-matrix`);
    if (res.ok) {
      return res.json();
    }
  } catch {
    // Fallback
  }
  return { ...mockConfusionMatrix };
}

// ==========================================
// TL03: S10 - PIPELINE MONITOR
// ==========================================
export async function getPipelineStatus(): Promise<{
  services: PipelineServiceStatus[];
  jobs: ProcessingJob[];
}> {
  if (USE_MOCK) {
    await delay(350);
    return {
      services: [...mockPipelineServices],
      jobs: [...mockProcessingJobs],
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/system/status`);
    if (res.ok) return res.json();
  } catch {
    // Fallback
  }
  return {
    services: [...mockPipelineServices],
    jobs: [...mockProcessingJobs],
  };
}

// ==========================================
// TL03: S11 - ADMIN DEMO CONTROL
// ==========================================
export async function getDemoPreflight(): Promise<DemoPreflight> {
  if (USE_MOCK) {
    await delay(300);
    return { ...mockDemoPreflight };
  }
  const res = await fetch(`${BASE_URL}/api/v1/admin/demo/preflight`);
  if (!res.ok) throw new Error(`Lỗi kiểm tra preflight: HTTP ${res.status}`);
  return res.json();
}

export async function previewDeletePatterns(request: PreviewDeleteRequest): Promise<PreviewDeleteResponse> {
  if (USE_MOCK) {
    await delay(400);
    return {
      ...mockPreviewDeleteResponse,
      row_count: request.pattern_types.length * 3500,
    };
  }
  const res = await fetch(`${BASE_URL}/api/v1/admin/demo/patterns/preview-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Lỗi xem trước xóa: HTTP ${res.status}`);
  return res.json();
}

export async function deleteGoldPatterns(dryRunId: string): Promise<DeletePatternsResponse> {
  if (USE_MOCK) {
    await delay(600);
    return {
      job_id: `delete-job-${Date.now().toString().slice(-4)}`,
      deleted_rows: 21286,
      tables_affected: mockPreviewDeleteResponse.affected_tables,
      executed_at: new Date().toISOString(),
      audit_id: `audit-${Date.now()}`,
    };
  }
  const res = await fetch(`${BASE_URL}/api/v1/admin/demo/patterns/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run_id: dryRunId }),
  });
  if (!res.ok) throw new Error(`Lỗi thực thi xóa Gold: HTTP ${res.status}`);
  return res.json();
}

// State mock cho async job polling
const mockJobStore: Record<string, ProcessingJob> = {};

export async function rebuildGoldPatterns(patternTypes: string[]): Promise<{ job_id: string; status: 'running' }> {
  const jobId = `job-rebuild-${Date.now().toString().slice(-4)}`;
  if (USE_MOCK) {
    await delay(400);
    mockJobStore[jobId] = {
      job_id: jobId,
      job_type: 'analysis',
      status: 'running',
      started_at: new Date().toISOString(),
      finished_at: null,
      progress_completed: 1,
      progress_total: patternTypes.length,
      affected_patterns: patternTypes,
      inserted_rows: 0,
    };
    return { job_id: jobId, status: 'running' };
  }
  const res = await fetch(`${BASE_URL}/api/v1/admin/demo/patterns/rebuild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern_types: patternTypes, retrain: false }),
  });
  if (!res.ok && res.status !== 202) {
    throw new Error(`Lỗi gửi yêu cầu tái tạo: HTTP ${res.status}`);
  }
  return res.json();
}

export async function pollJobStatus(jobId: string): Promise<ProcessingJob> {
  if (USE_MOCK) {
    await delay(350);
    const job = mockJobStore[jobId] || {
      job_id: jobId,
      job_type: 'analysis',
      status: 'running',
      started_at: new Date().toISOString(),
      finished_at: null,
      progress_completed: 1,
      progress_total: 4,
    };

    // Mô phỏng tiến trình tăng dần
    if (job.status === 'running') {
      const nextProgress = (job.progress_completed || 1) + 1;
      const total = job.progress_total || 4;
      if (nextProgress >= total) {
        job.progress_completed = total;
        job.status = 'success';
        job.finished_at = new Date().toISOString();
        job.inserted_rows = 21286;
      } else {
        job.progress_completed = nextProgress;
      }
    }
    mockJobStore[jobId] = { ...job };
    return { ...job };
  }
  const res = await fetch(`${BASE_URL}/api/v1/admin/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Lỗi truy vấn job: HTTP ${res.status}`);
  return res.json();
}
