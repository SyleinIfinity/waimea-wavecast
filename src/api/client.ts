import type {
  LatestResponse,
  IssuedForecast,
  ForecastHorizon,
  ForecastSource,
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
const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const BASE_URL = configuredBase.endsWith('/api/v1') ? configuredBase : `${configuredBase}/api/v1`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!configuredBase) throw new Error('Chưa cấu hình VITE_API_BASE_URL.');
  const response = await fetch(`${BASE_URL}${path}`, init);
  if (!response.ok) throw new Error(`API ${path.split('?')[0]} trả về HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}
type Envelope<T> = { status: string; data: T };
function required<T>(response: Envelope<T | null>, name: string): T {
  if (response.status !== 'ok' || response.data == null ||
      (Array.isArray(response.data) && response.data.length === 0)) {
    throw new Error(`Backend chưa có dữ liệu ${name}.`);
  }
  return response.data;
}

export async function loadLatest(signal?: AbortSignal): Promise<LatestResponse> {
  const result = await api<LatestResponse>('/observations/latest', { signal });
  required(result, 'quan trắc mới nhất');
  return result;
}

type ForecastEnvelope = { status: 'ok' | 'empty'; quality_status?: string; data: unknown[] };

function parseForecasts(response: ForecastEnvelope, source: ForecastSource): IssuedForecast[] {
  if (!response || !['ok', 'empty'].includes(response.status) || !Array.isArray(response.data)) {
    throw new Error(`Backend trả về danh sách dự báo ${source} không hợp lệ.`);
  }
  if (response.status === 'empty') {
    if (response.data.length) throw new Error(`Backend trả về trạng thái dự báo ${source} không nhất quán.`);
    return [];
  }
  return response.data.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Bản ghi dự báo ${source} số ${index + 1} không hợp lệ.`);
    }
    const row = item as Record<string, unknown>;
    const horizon = row.horizon;
    const quality = row.quality_status ?? response.quality_status;
    if (!['30min', '1d', '7d', '30d'].includes(String(horizon)) ||
        !Number.isInteger(row.forecast_id) || !Number.isInteger(row.model_id) ||
        typeof row.model_version !== 'string' || typeof row.target_kind !== 'string' ||
        typeof row.issued_at !== 'string' || !Number.isFinite(Date.parse(row.issued_at)) ||
        typeof row.target_at !== 'string' || !Number.isFinite(Date.parse(row.target_at)) ||
        typeof row.predicted_value !== 'number' || !Number.isFinite(row.predicted_value) ||
        (row.actual_value != null && (typeof row.actual_value !== 'number' || !Number.isFinite(row.actual_value))) ||
        (row.absolute_error != null && (typeof row.absolute_error !== 'number' || !Number.isFinite(row.absolute_error))) ||
        typeof quality !== 'string') {
      throw new Error(`Bản ghi dự báo ${source} số ${index + 1} thiếu trường bắt buộc.`);
    }
    return {
      forecast_id: row.forecast_id as number,
      model_id: row.model_id as number,
      model_version: row.model_version,
      horizon: horizon as ForecastHorizon,
      target_kind: row.target_kind,
      issued_at: row.issued_at,
      target_at: row.target_at,
      target_date_hst: typeof row.target_date_hst === 'string' ? row.target_date_hst : null,
      predicted_value: row.predicted_value,
      actual_value: row.actual_value == null ? null : row.actual_value as number,
      absolute_error: row.absolute_error == null ? null : row.absolute_error as number,
      evaluated_at: typeof row.evaluated_at === 'string' ? row.evaluated_at : null,
      quality_status: quality,
      source,
    };
  });
}

export async function getForwardForecasts(signal?: AbortSignal): Promise<IssuedForecast[]> {
  return parseForecasts(await api<ForecastEnvelope>('/forecasts/experimental/latest?limit=100', { signal }), 'forward');
}

export async function getShadowForecasts(horizon: ForecastHorizon, signal?: AbortSignal): Promise<IssuedForecast[]> {
  const query = new URLSearchParams({ horizon, limit: '30' });
  return parseForecasts(await api<ForecastEnvelope>(`/forecasts/shadow/latest?${query}`, { signal }), 'shadow');
}

type ClusterRow = { model_id: number; date_hst: string; cluster_label: number; distance_to_centroid: number; centroid_features: Record<string, number> };
type ProfileRow = { model_id: number; cluster_label: number; cluster_name: string | null; centroid_features: Record<string, number>; sample_count: number; created_at: string };
type RawModel = Record<string, any>;
export async function getClusteringSummary(): Promise<ClusteringSummary> {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const assignments = required(await api<Envelope<ClusterRow[]>>(`/clusters?start_hst=${start}&end_hst=${end}&limit=500`), 'phân cụm');
  const modelId = assignments[0].model_id;
  const [profilesResponse, modelsResponse] = await Promise.all([
    api<Envelope<ProfileRow[]>>(`/clusters/profiles?model_id=${modelId}`),
    api<Envelope<RawModel[]>>('/models?task_type=clustering'),
  ]);
  const profiles = required(profilesResponse, 'tâm cụm');
  const model = modelsResponse.data.find(item => item.model_id === modelId);
  if (!model) throw new Error(`Backend không có metadata cho model ${modelId}.`);
  const total = profiles.reduce((sum, profile) => sum + profile.sample_count, 0);
  const colors = ['#38bdf8', '#f59e0b', '#a78bfa', '#34d399'];
  return { model_id: modelId, model_version: model.model_version, algorithm: model.algorithm,
    k: profiles.length, silhouette_score: model.evaluation_metrics?.silhouette_score ?? null,
    davies_bouldin_index: model.evaluation_metrics?.davies_bouldin_index ?? null,
    trained_at: model.trained_at ?? model.created_at,
    centroids: profiles.map((profile, index) => ({
      cluster_id: profile.cluster_label, cluster_label: profile.cluster_name || `Cụm ${profile.cluster_label}`,
      color: colors[index % colors.length], sample_count: profile.sample_count,
      percentage: total ? Number((100 * profile.sample_count / total).toFixed(1)) : 0,
      features: Object.entries(profile.centroid_features).map(([name, value]) => ({
        feature_name: name, label: name, original_value: value, z_score: value, unit: '',
      })),
    })),
    assignments: assignments.map(row => ({ date_hst: row.date_hst, cluster_id: row.cluster_label,
      cluster_label: profiles.find(p => p.cluster_label === row.cluster_label)?.cluster_name || `Cụm ${row.cluster_label}`,
      distance_to_centroid: row.distance_to_centroid,
      wave_height_median_m: row.centroid_features?.wave_height_median_lag0 ?? null,
      dominant_period_mean_s: row.centroid_features?.dominant_period_lag0 ?? null,
    })),
  };
}
export async function getModelRegistry(): Promise<ModelRegistryItem[]> {
  const rows = required(await api<Envelope<RawModel[]>>('/models'), 'danh mục model');
  return rows.map(m => ({ model_id: m.model_id, model_name: m.model_name, model_version: m.model_version,
    task_type: m.task_type, algorithm: m.algorithm, status: m.status, created_at: m.created_at,
    dataset_version: m.dataset_version ?? 'Chưa có', features_used: m.feature_names ?? [],
    artifact_gcs_uri: m.artifact_gcs_uri,
    metrics: { mae: m.evaluation_metrics?.metrics?.model?.mae ?? m.evaluation_metrics?.test?.mae,
      rmse: m.evaluation_metrics?.metrics?.model?.rmse ?? m.evaluation_metrics?.test?.rmse,
      r2: m.evaluation_metrics?.metrics?.model?.r2_score ?? m.evaluation_metrics?.test?.r2,
      accuracy: m.evaluation_metrics?.metrics?.model?.accuracy ?? m.evaluation_metrics?.test?.accuracy,
      macro_f1: m.evaluation_metrics?.metrics?.model?.macro_f1 ?? m.evaluation_metrics?.test?.macro_f1,
      silhouette: m.evaluation_metrics?.silhouette_score },
  }));
}
export async function getConfusionMatrix(): Promise<ConfusionMatrixData> {
  const response = await api<Envelope<ConfusionMatrixData> | ConfusionMatrixData>('/models/classification/confusion-matrix');
  return 'status' in response ? required(response, 'confusion matrix') : response;
}
export async function getPipelineStatus(): Promise<{ services: PipelineServiceStatus[]; jobs: ProcessingJob[] }> {
  const result = await api<{ services: PipelineServiceStatus[]; jobs: ProcessingJob[] }>('/admin/system/status');
  if (!Array.isArray(result.services) || !Array.isArray(result.jobs)) throw new Error('Backend trả về trạng thái pipeline không hợp lệ.');
  if (!result.services.length && !result.jobs.length) throw new Error('Backend chưa có dữ liệu pipeline.');
  return result;
}

export async function getDemoPreflight(): Promise<DemoPreflight> {
  return api<DemoPreflight>('/admin/demo/preflight');
}
export async function previewDeletePatterns(request: PreviewDeleteRequest): Promise<PreviewDeleteResponse> {
  return api<PreviewDeleteResponse>('/admin/demo/patterns/preview-delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
  });
}
export async function deleteGoldPatterns(dryRunId: string): Promise<DeletePatternsResponse> {
  return api<DeletePatternsResponse>('/admin/demo/patterns/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dry_run_id: dryRunId }),
  });
}
export async function rebuildGoldPatterns(patternTypes: string[]): Promise<{ job_id: string; status: 'running' }> {
  return api<{ job_id: string; status: 'running' }>('/admin/demo/patterns/rebuild', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern_types: patternTypes, retrain: false }),
  });
}
export async function pollJobStatus(jobId: string): Promise<ProcessingJob> {
  return api<ProcessingJob>(`/admin/jobs/${encodeURIComponent(jobId)}`);
}
