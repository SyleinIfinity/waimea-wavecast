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

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = !import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_USE_MOCK === 'true';

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
  const res = await fetch(`${BASE_URL}/api/v1/predictions/latest`);
  if (!res.ok) throw new Error(`Lỗi tải dự báo: HTTP ${res.status}`);
  return res.json();
}

export async function getForecastHistory(): Promise<ForecastHistoryPoint[]> {
  if (USE_MOCK) {
    await delay(300);
    return [...mockForecastHistory];
  }
  const res = await fetch(`${BASE_URL}/api/v1/predictions/history`);
  if (!res.ok) throw new Error(`Lỗi tải lịch sử: HTTP ${res.status}`);
  return res.json();
}

export async function getLatestClassification(): Promise<WaveClassification> {
  if (USE_MOCK) {
    await delay(250);
    return { ...mockLatestClassification };
  }
  const res = await fetch(`${BASE_URL}/api/v1/classifications/latest`);
  if (!res.ok) throw new Error(`Lỗi tải phân loại: HTTP ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/v1/analytics/correlations?method=${method}`);
  if (!res.ok) throw new Error(`Lỗi tải ma trận tương quan: HTTP ${res.status}`);
  return res.json();
}

export async function getScatterData(var1: string, var2: string): Promise<ScatterPoint[]> {
  if (USE_MOCK) {
    await delay(200);
    return generateMockScatter(var1, var2);
  }
  const res = await fetch(`${BASE_URL}/api/v1/analytics/scatter?var1=${var1}&var2=${var2}`);
  if (!res.ok) throw new Error(`Lỗi tải điểm phân tán: HTTP ${res.status}`);
  return res.json();
}

// ==========================================
// TL03: S06 - CLUSTERING
// ==========================================
export async function getClusteringSummary(): Promise<ClusteringSummary> {
  if (USE_MOCK) {
    await delay(400);
    return { ...mockClusteringSummary };
  }
  const res = await fetch(`${BASE_URL}/api/v1/clusters`);
  if (!res.ok) throw new Error(`Lỗi tải phân cụm K-means: HTTP ${res.status}`);
  return res.json();
}

// ==========================================
// TL03: S08 - MODEL LAB / EVALUATION
// ==========================================
export async function getModelRegistry(): Promise<ModelRegistryItem[]> {
  if (USE_MOCK) {
    await delay(300);
    return [...mockModelRegistry];
  }
  const res = await fetch(`${BASE_URL}/api/v1/models`);
  if (!res.ok) throw new Error(`Lỗi tải danh mục mô hình: HTTP ${res.status}`);
  return res.json();
}

export async function getConfusionMatrix(): Promise<ConfusionMatrixData> {
  if (USE_MOCK) {
    await delay(250);
    return { ...mockConfusionMatrix };
  }
  const res = await fetch(`${BASE_URL}/api/v1/models/classification/confusion-matrix`);
  if (!res.ok) throw new Error(`Lỗi tải confusion matrix: HTTP ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/v1/admin/system/status`);
  if (!res.ok) throw new Error(`Lỗi tải trạng thái pipeline: HTTP ${res.status}`);
  return res.json();
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
