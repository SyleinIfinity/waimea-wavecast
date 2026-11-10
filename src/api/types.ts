// ==========================================
// WAIMEA WAVECAST - SHARED API CONTRACT TYPES
// Compliant with 00_HOP_DONG_CHUNG.md & FE Spec v1.0
// ==========================================

export type Station = {
  station_id: '51201';
  name: string;
  latitude: number;
  longitude: number;
  timezone: 'Pacific/Honolulu';
};

// ------------------------------------------
// SILVER - Observations
// ------------------------------------------
export type LatestObservation = {
  station_id: string;
  source: string;
  observed_at: string; // ISO UTC
  wave_height_m: number | null; // WVHT
  dominant_period_s: number | null; // DPD
  average_period_s?: number | null; // APD
  wave_direction_deg: number | null; // MWD
  sea_temperature_c: number | null; // WTMP
  quality_flag: 'unverified' | 'valid' | 'partial' | 'suspect' | 'rejected';
  revision_no?: number;
};

export type LatestResponse = {
  status: 'ok' | 'empty';
  data_type: 'observation';
  data: LatestObservation | null;
};

// ------------------------------------------
// TL03: S07 - Forecast & Classification DTO
// ------------------------------------------
export type WaveForecast = {
  prediction_id: number;
  station_id: '51201';
  target_metric: 'WVHT';
  target_aggregation: 'daily_median';
  target_date_hst: string; // YYYY-MM-DD in HST
  feature_cutoff_date_hst: string; // YYYY-MM-DD
  issued_at: string; // ISO UTC
  predicted_value_m: number;
  lower_m?: number | null;
  upper_m?: number | null;
  actual_value_m: number | null;
  absolute_error_m: number | null;
  model: {
    model_id: number;
    name: string;
    version: string;
  };
  data_quality_status: 'ready' | 'partial' | 'insufficient_data';
};

export type ForecastHistoryPoint = {
  target_date_hst: string;
  predicted_value_m: number;
  actual_value_m: number | null;
  absolute_error_m: number | null;
  model_version: string;
};

export type ClassificationThreshold = {
  label: 'Low' | 'Medium' | 'High' | string;
  min_m: number;
  max_m: number | null;
  color?: string;
};

export type ClassificationScheme = {
  scheme_id: number;
  name: string;
  version: string;
  thresholds: ClassificationThreshold[];
};

export type WaveClassification = {
  classification_id: number;
  station_id: '51201';
  target_date_hst: string;
  issued_at: string;
  predicted_label: 'Low' | 'Medium' | 'High' | string;
  actual_label: string | null;
  confidence: number | null;
  class_probabilities?: Record<string, number>;
  scheme: ClassificationScheme;
  model: {
    model_id: number;
    name: string;
    version: string;
  };
};

// ------------------------------------------
// TL03: S05 - Correlation Explorer DTO
// ------------------------------------------
export type CorrelationCell = {
  var1: string;
  var2: string;
  coefficient: number | null; // -1.0 to 1.0, null if invalid or constant
  paired_sample_count: number;
  is_valid: boolean;
};

export type CorrelationMatrix = {
  station_id: '51201';
  period_start_hst: string;
  period_end_hst: string;
  method: 'pearson' | 'spearman';
  variables: string[];
  matrix: CorrelationCell[][];
  computed_at: string;
};

export type ScatterPoint = {
  x: number;
  y: number;
  observed_at: string;
  date_hst: string;
};

// ------------------------------------------
// TL03: S06 - Clustering DTO
// ------------------------------------------
export type ClusterAssignment = {
  date_hst: string;
  cluster_id: number; // 0, 1, 2...
  cluster_label?: string; // Hậu kiểm (vd: "Sóng thấp - chu kỳ ngắn")
  distance_to_centroid: number;
  wave_height_median_m: number;
  dominant_period_mean_s: number;
};

export type CentroidFeature = {
  feature_name: string;
  label: string;
  z_score: number; // normalized
  original_value: number;
  unit: string;
};

export type ClusterCentroid = {
  cluster_id: number;
  cluster_label: string;
  color: string;
  features: CentroidFeature[];
  sample_count: number;
  percentage: number;
};

export type ClusteringSummary = {
  model_id: number;
  model_version: string;
  algorithm: 'K-means';
  k: number;
  silhouette_score: number;
  davies_bouldin_index: number;
  trained_at: string;
  centroids: ClusterCentroid[];
  assignments: ClusterAssignment[];
};

// ------------------------------------------
// TL03: S08 - Model Evaluation DTO
// ------------------------------------------
export type ConfusionMatrixData = {
  labels: string[];
  matrix: number[][]; // [actual_idx][predicted_idx]
  total_samples: number;
};

export type ModelRegistryItem = {
  model_id: number;
  model_name: string;
  model_version: string;
  task_type: 'regression' | 'classification' | 'clustering';
  algorithm: string;
  status: 'draft' | 'ready' | 'retired';
  created_at: string;
  dataset_version: string;
  features_used: string[];
  metrics: {
    mae?: number;
    rmse?: number;
    r2?: number;
    accuracy?: number;
    macro_f1?: number;
    silhouette?: number;
  };
  baseline_metrics?: {
    baseline_name: string;
    mae?: number;
    rmse?: number;
    r2?: number;
  };
  baseline_comparison?: {
    baseline_name: string;
    mae?: number;
    rmse?: number;
    r2?: number;
  };
  hyperparameters?: Record<string, unknown>;
  artifact_gcs_uri?: string;
};

export type EvaluationSample = {
  sample_id: number;
  date_hst: string;
  actual_value: number;
  predicted_value: number;
  residual: number;
};

// ------------------------------------------
// TL03: S10 - Pipeline Monitor DTO
// ------------------------------------------
export type PipelineServiceStatus = {
  service_id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'error';
  last_run_at: string;
  duration_s: number;
  affected_rows: number;
  error_message?: string | null;
};

export type ProcessingJob = {
  job_id: string;
  job_type: 'ingestion' | 'preprocessing' | 'analysis' | 'clustering' | 'prediction' | 'classification';
  status: 'queued' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  started_at: string | null;
  finished_at: string | null;
  progress_completed?: number;
  progress_total?: number;
  inserted_rows?: number;
  deleted_rows?: number;
  affected_patterns?: string[];
  error?: { code: string; message: string } | null;
};

// ------------------------------------------
// TL03: S11 - Admin Demo Control DTO
// ------------------------------------------
export type DemoPreflight = {
  environment: 'staging' | 'sandbox' | 'production';
  allow_delete: boolean;
  database_connected: boolean;
  model_ready: boolean;
  gcs_verified: boolean;
  counts: {
    bronze_rows: number;
    silver_rows: number;
    gold_metrics_rows: number;
    gold_trend_seasonal_rows: number;
    gold_correlations_rows: number;
    gold_clustering_rows: number;
    gold_predictions_rows: number;
    gold_classifications_rows: number;
    model_registry_count: number;
  };
};

export type PreviewDeleteRequest = {
  station_id: '51201';
  from_hst: string;
  to_hst: string;
  pattern_types: ('time_series' | 'trend_seasonal' | 'correlations' | 'clustering' | 'predictions' | 'classifications')[];
};

export type PreviewDeleteResponse = {
  dry_run_id: string;
  affected_tables: string[];
  row_count: number;
  protected_tables: string[];
  safe_to_delete: boolean;
  expires_at: string;
};

export type DeletePatternsResponse = {
  job_id: string;
  deleted_rows: number;
  tables_affected: string[];
  executed_at: string;
  audit_id: string;
};
