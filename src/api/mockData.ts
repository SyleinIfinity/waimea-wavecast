import type {
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
  PreviewDeleteResponse,
} from './types';

// ==========================================
// S07: FORECAST & CLASSIFICATION MOCK
// ==========================================
export const mockLatestForecast: WaveForecast = {
  prediction_id: 2026110801,
  station_id: '51201',
  target_metric: 'WVHT',
  target_aggregation: 'daily_median',
  target_date_hst: '2026-11-09',
  feature_cutoff_date_hst: '2026-11-08',
  issued_at: '2026-11-08T18:00:00Z',
  predicted_value_m: 2.35,
  lower_m: 2.05,
  upper_m: 2.65,
  actual_value_m: null, // Chưa diễn ra
  absolute_error_m: null,
  model: {
    model_id: 101,
    name: 'RandomForest_WVHT_DailyMedian',
    version: 'v2026.11.01-prod',
  },
  data_quality_status: 'ready',
};

export const mockForecastHistory: ForecastHistoryPoint[] = [
  { target_date_hst: '2026-10-15', predicted_value_m: 1.8, actual_value_m: 1.7, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-16', predicted_value_m: 2.1, actual_value_m: 2.3, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-17', predicted_value_m: 2.6, actual_value_m: 2.5, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-18', predicted_value_m: 3.2, actual_value_m: 3.5, absolute_error_m: 0.3, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-19', predicted_value_m: 3.8, actual_value_m: 4.1, absolute_error_m: 0.3, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-20', predicted_value_m: 3.4, actual_value_m: 3.2, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-21', predicted_value_m: 2.7, actual_value_m: 2.8, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-22', predicted_value_m: 2.2, actual_value_m: 2.0, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-23', predicted_value_m: 1.9, actual_value_m: 1.8, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-24', predicted_value_m: 1.6, actual_value_m: 1.5, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-25', predicted_value_m: 2.0, actual_value_m: 2.2, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-26', predicted_value_m: 2.5, actual_value_m: 2.4, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-27', predicted_value_m: 3.0, actual_value_m: 2.8, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-28', predicted_value_m: 3.5, actual_value_m: 3.7, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-29', predicted_value_m: 4.2, actual_value_m: 4.6, absolute_error_m: 0.4, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-30', predicted_value_m: 4.0, actual_value_m: 3.8, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-10-31', predicted_value_m: 3.1, actual_value_m: 3.0, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-01', predicted_value_m: 2.4, actual_value_m: 2.6, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-02', predicted_value_m: 2.0, actual_value_m: 1.9, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-03', predicted_value_m: 1.8, actual_value_m: 1.9, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-04', predicted_value_m: 2.2, actual_value_m: 2.1, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-05', predicted_value_m: 2.5, actual_value_m: 2.7, absolute_error_m: 0.2, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-06', predicted_value_m: 2.9, actual_value_m: 2.8, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-07', predicted_value_m: 2.6, actual_value_m: 2.5, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-08', predicted_value_m: 2.2, actual_value_m: 2.3, absolute_error_m: 0.1, model_version: 'v2026.11.01' },
  { target_date_hst: '2026-11-09', predicted_value_m: 2.35, actual_value_m: null, absolute_error_m: null, model_version: 'v2026.11.01' },
];

export const mockLatestClassification: WaveClassification = {
  classification_id: 301,
  station_id: '51201',
  target_date_hst: '2026-11-09',
  issued_at: '2026-11-08T18:00:00Z',
  predicted_label: 'Medium',
  actual_label: null,
  confidence: 0.78,
  class_probabilities: {
    Low: 0.12,
    Medium: 0.78,
    High: 0.10,
  },
  scheme: {
    scheme_id: 1,
    name: 'Waimea Coastal Surf Scheme v1',
    version: '1.0',
    thresholds: [
      { label: 'Low', min_m: 0.0, max_m: 1.8, color: '#3b82f6' },
      { label: 'Medium', min_m: 1.8, max_m: 3.2, color: '#eab308' },
      { label: 'High', min_m: 3.2, max_m: null, color: '#ef4444' },
    ],
  },
  model: {
    model_id: 201,
    name: 'RandomForest_WaveCategory',
    version: 'v2026.11.01-prod',
  },
};

// ==========================================
// S05: CORRELATION EXPLORER MOCK
// ==========================================
export const mockCorrelationMatrix: CorrelationMatrix = {
  station_id: '51201',
  period_start_hst: '2026-01-01',
  period_end_hst: '2026-11-08',
  method: 'pearson',
  variables: ['WVHT', 'DPD', 'APD', 'MWD', 'WTMP'],
  matrix: [
    // WVHT
    [
      { var1: 'WVHT', var2: 'WVHT', coefficient: 1.00, paired_sample_count: 7200, is_valid: true },
      { var1: 'WVHT', var2: 'DPD', coefficient: 0.68, paired_sample_count: 7150, is_valid: true },
      { var1: 'WVHT', var2: 'APD', coefficient: 0.74, paired_sample_count: 7180, is_valid: true },
      { var1: 'WVHT', var2: 'MWD', coefficient: -0.32, paired_sample_count: 6980, is_valid: true },
      { var1: 'WVHT', var2: 'WTMP', coefficient: -0.45, paired_sample_count: 5400, is_valid: true },
    ],
    // DPD
    [
      { var1: 'DPD', var2: 'WVHT', coefficient: 0.68, paired_sample_count: 7150, is_valid: true },
      { var1: 'DPD', var2: 'DPD', coefficient: 1.00, paired_sample_count: 7200, is_valid: true },
      { var1: 'DPD', var2: 'APD', coefficient: 0.82, paired_sample_count: 7190, is_valid: true },
      { var1: 'DPD', var2: 'MWD', coefficient: -0.28, paired_sample_count: 6950, is_valid: true },
      { var1: 'DPD', var2: 'WTMP', coefficient: -0.38, paired_sample_count: 5380, is_valid: true },
    ],
    // APD
    [
      { var1: 'APD', var2: 'WVHT', coefficient: 0.74, paired_sample_count: 7180, is_valid: true },
      { var1: 'APD', var2: 'DPD', coefficient: 0.82, paired_sample_count: 7190, is_valid: true },
      { var1: 'APD', var2: 'APD', coefficient: 1.00, paired_sample_count: 7200, is_valid: true },
      { var1: 'APD', var2: 'MWD', coefficient: -0.25, paired_sample_count: 6970, is_valid: true },
      { var1: 'APD', var2: 'WTMP', coefficient: -0.41, paired_sample_count: 5390, is_valid: true },
    ],
    // MWD
    [
      { var1: 'MWD', var2: 'WVHT', coefficient: -0.32, paired_sample_count: 6980, is_valid: true },
      { var1: 'MWD', var2: 'DPD', coefficient: -0.28, paired_sample_count: 6950, is_valid: true },
      { var1: 'MWD', var2: 'APD', coefficient: -0.25, paired_sample_count: 6970, is_valid: true },
      { var1: 'MWD', var2: 'MWD', coefficient: 1.00, paired_sample_count: 7000, is_valid: true },
      { var1: 'MWD', var2: 'WTMP', coefficient: 0.15, paired_sample_count: 5200, is_valid: true },
    ],
    // WTMP
    [
      { var1: 'WTMP', var2: 'WVHT', coefficient: -0.45, paired_sample_count: 5400, is_valid: true },
      { var1: 'WTMP', var2: 'DPD', coefficient: -0.38, paired_sample_count: 5380, is_valid: true },
      { var1: 'WTMP', var2: 'APD', coefficient: -0.41, paired_sample_count: 5390, is_valid: true },
      { var1: 'WTMP', var2: 'MWD', coefficient: 0.15, paired_sample_count: 5200, is_valid: true },
      { var1: 'WTMP', var2: 'WTMP', coefficient: 1.00, paired_sample_count: 5500, is_valid: true },
    ],
  ],
  computed_at: '2026-11-08T04:00:00Z',
};

export const generateMockScatter = (var1: string, var2: string): ScatterPoint[] => {
  const points: ScatterPoint[] = [];
  const baseWVHT = [1.2, 1.5, 1.8, 2.1, 2.5, 3.0, 3.5, 4.2, 4.8, 5.5];
  for (let i = 0; i < 80; i++) {
    const xVal = 1.0 + Math.random() * 4.5;
    // Tương quan dương nếu là WVHT vs DPD
    const noise = (Math.random() - 0.5) * 2.0;
    const yVal = var2 === 'DPD' ? 7.0 + xVal * 1.8 + noise : 22.0 - xVal * 1.2 + noise;
    points.push({
      x: parseFloat(xVal.toFixed(2)),
      y: parseFloat(yVal.toFixed(2)),
      observed_at: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`,
      date_hst: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
    });
  }
  return points;
};

// ==========================================
// S06: CLUSTERING K-MEANS MOCK
// ==========================================
export const mockClusteringSummary: ClusteringSummary = {
  model_id: 401,
  model_version: 'kmeans_k3_v2026.11',
  algorithm: 'K-means',
  k: 3,
  silhouette_score: 0.534,
  davies_bouldin_index: 0.78,
  trained_at: '2026-11-05T02:00:00Z',
  centroids: [
    {
      cluster_id: 0,
      cluster_label: 'Cụm 0: Sóng êm & Chu kỳ ngắn (Mùa hè Hawaii)',
      color: '#38bdf8', // sky
      sample_count: 1420,
      percentage: 42.5,
      features: [
        { feature_name: 'wave_height_median_m', label: 'Độ cao sóng trung vị', z_score: -0.85, original_value: 1.25, unit: 'm' },
        { feature_name: 'dominant_period_mean_s', label: 'Chu kỳ sóng trội', z_score: -0.92, original_value: 8.4, unit: 's' },
        { feature_name: 'average_period_mean_s', label: 'Chu kỳ sóng TB', z_score: -0.78, original_value: 6.2, unit: 's' },
        { feature_name: 'sea_surface_temp_c', label: 'Nhiệt độ mặt nước', z_score: 0.95, original_value: 26.8, unit: '°C' },
      ],
    },
    {
      cluster_id: 1,
      cluster_label: 'Cụm 1: Sóng trung bình & Chu kỳ chuyển tiếp',
      color: '#facc15', // amber
      sample_count: 1250,
      percentage: 37.4,
      features: [
        { feature_name: 'wave_height_median_m', label: 'Độ cao sóng trung vị', z_score: 0.15, original_value: 2.35, unit: 'm' },
        { feature_name: 'dominant_period_mean_s', label: 'Chu kỳ sóng trội', z_score: 0.28, original_value: 12.1, unit: 's' },
        { feature_name: 'average_period_mean_s', label: 'Chu kỳ sóng TB', z_score: 0.20, original_value: 7.9, unit: 's' },
        { feature_name: 'sea_surface_temp_c', label: 'Nhiệt độ mặt nước', z_score: 0.10, original_value: 25.1, unit: '°C' },
      ],
    },
    {
      cluster_id: 2,
      cluster_label: 'Cụm 2: Sóng lớn Swell Bắc Thái Bình Dương (Mùa đông)',
      color: '#ef4444', // red
      sample_count: 670,
      percentage: 20.1,
      features: [
        { feature_name: 'wave_height_median_m', label: 'Độ cao sóng trung vị', z_score: 1.72, original_value: 4.65, unit: 'm' },
        { feature_name: 'dominant_period_mean_s', label: 'Chu kỳ sóng trội', z_score: 1.55, original_value: 16.8, unit: 's' },
        { feature_name: 'average_period_mean_s', label: 'Chu kỳ sóng TB', z_score: 1.48, original_value: 10.4, unit: 's' },
        { feature_name: 'sea_surface_temp_c', label: 'Nhiệt độ mặt nước', z_score: -1.25, original_value: 23.4, unit: '°C' },
      ],
    },
  ],
  assignments: Array.from({ length: 60 }).map((_, idx) => {
    const d = new Date(2026, 8, 10 + idx); // Sep - Nov
    const dateStr = d.toISOString().split('T')[0];
    const month = d.getMonth() + 1;
    // Tháng 10-11 sóng lớn hơn
    const cluster = month === 11 ? (idx % 2 === 0 ? 2 : 1) : (idx % 3 === 0 ? 1 : 0);
    const heights = [1.3, 2.4, 4.8];
    const periods = [8.5, 12.0, 16.5];
    return {
      date_hst: dateStr,
      cluster_id: cluster,
      cluster_label: cluster === 0 ? 'Sóng êm' : cluster === 1 ? 'Trung bình' : 'Sóng lớn Swell',
      distance_to_centroid: parseFloat((0.2 + Math.random() * 0.4).toFixed(3)),
      wave_height_median_m: parseFloat((heights[cluster] + (Math.random() - 0.5) * 0.4).toFixed(2)),
      dominant_period_mean_s: parseFloat((periods[cluster] + (Math.random() - 0.5) * 1.0).toFixed(1)),
    };
  }),
};

// ==========================================
// S08: MODEL EVALUATION & REGISTRY MOCK
// ==========================================
export const mockModelRegistry: ModelRegistryItem[] = [
  {
    model_id: 101,
    model_name: 'RandomForest_WVHT_DailyMedian',
    model_version: 'v2026.11.01-prod',
    task_type: 'regression',
    algorithm: 'RandomForestRegressor (n_estimators=200, max_depth=12)',
    status: 'ready',
    created_at: '2026-11-01T04:00:00Z',
    dataset_version: 'wave_height_next_day_v1 (2007-2025)',
    features_used: ['wvht_median_lag0..6', 'dpd_mean_lag0..6', 'sin_mwd', 'cos_mwd', 'day_of_year_sin', 'day_of_year_cos'],
    metrics: { mae: 0.285, rmse: 0.382, r2: 0.814 },
    baseline_comparison: { baseline_name: 'Persistence Baseline (T+0 -> T+1)', mae: 0.512, rmse: 0.724, r2: 0.432 },
    hyperparameters: { n_estimators: 200, max_depth: 12, min_samples_split: 5, random_state: 42 },
    artifact_gcs_uri: 'gs://waimea-noaa/models/regression/v2026.11.01/model.joblib',
  },
  {
    model_id: 102,
    model_name: 'Ridge_WVHT_Baseline',
    model_version: 'v2026.10.15-bench',
    task_type: 'regression',
    algorithm: 'Ridge Regression (alpha=1.0)',
    status: 'draft',
    created_at: '2026-10-15T02:00:00Z',
    dataset_version: 'wave_height_next_day_v1',
    features_used: ['wvht_median_lag0..6', 'dpd_mean_lag0..6'],
    metrics: { mae: 0.412, rmse: 0.560, r2: 0.655 },
    baseline_comparison: { baseline_name: 'Persistence Baseline', mae: 0.512, rmse: 0.724, r2: 0.432 },
    artifact_gcs_uri: 'gs://waimea-noaa/models/regression/v2026.10.15/model.joblib',
  },
  {
    model_id: 201,
    model_name: 'RandomForest_WaveCategory',
    model_version: 'v2026.11.01-prod',
    task_type: 'classification',
    algorithm: 'RandomForestClassifier (n_estimators=150)',
    status: 'ready',
    created_at: '2026-11-01T05:00:00Z',
    dataset_version: 'wave_height_category_v1',
    features_used: ['wvht_median_lag0..6', 'dpd_mean_lag0..6', 'month_categorical'],
    metrics: { accuracy: 0.842, macro_f1: 0.828 },
    hyperparameters: { n_estimators: 150, class_weight: 'balanced' },
    artifact_gcs_uri: 'gs://waimea-noaa/models/classification/v2026.11.01/model.joblib',
  },
  {
    model_id: 401,
    model_version: 'kmeans_k3_v2026.11',
    model_name: 'KMeans_WaveRegimes_Daily',
    task_type: 'clustering',
    algorithm: 'K-means (k=3, n_init=20)',
    status: 'ready',
    created_at: '2026-11-05T02:00:00Z',
    dataset_version: 'daily_features_2007_2025',
    features_used: ['wvht_median', 'dpd_mean', 'apd_mean', 'wtmp_mean'],
    metrics: { silhouette: 0.534 },
    hyperparameters: { n_clusters: 3, n_init: 20, random_state: 42 },
  },
];

export const mockConfusionMatrix: ConfusionMatrixData = {
  labels: ['Low (<1.8m)', 'Medium (1.8-3.2m)', 'High (>3.2m)'],
  matrix: [
    [412, 38, 2],
    [45, 380, 25],
    [5, 28, 165],
  ],
  total_samples: 1100,
};

// ==========================================
// S10: PIPELINE MONITOR MOCK
// ==========================================
export const mockPipelineServices: PipelineServiceStatus[] = [
  { service_id: 'noaa_ingestion', name: 'NOAA 51201 Ingestion', status: 'healthy', last_run_at: '2026-11-08T09:30:00Z', duration_s: 4.2, affected_rows: 48 },
  { service_id: 'silver_preprocessing', name: 'Silver Preprocessing & QC', status: 'healthy', last_run_at: '2026-11-08T09:32:00Z', duration_s: 6.8, affected_rows: 48 },
  { service_id: 'gold_analysis', name: 'Gold Time-Series & Metrics', status: 'healthy', last_run_at: '2026-11-08T09:35:00Z', duration_s: 12.4, affected_rows: 1 },
  { service_id: 'gold_clustering', name: 'Gold K-means Inference', status: 'healthy', last_run_at: '2026-11-08T09:36:00Z', duration_s: 3.1, affected_rows: 1 },
  { service_id: 'gold_prediction', name: 'Regression Inference (T+1)', status: 'healthy', last_run_at: '2026-11-08T09:38:00Z', duration_s: 2.8, affected_rows: 1 },
  { service_id: 'gold_classification', name: 'Classification Inference', status: 'healthy', last_run_at: '2026-11-08T09:39:00Z', duration_s: 2.5, affected_rows: 1 },
];

export const mockProcessingJobs: ProcessingJob[] = [
  {
    job_id: 'job-9842',
    job_type: 'prediction',
    status: 'success',
    started_at: '2026-11-08T09:38:00Z',
    finished_at: '2026-11-08T09:38:03Z',
    progress_completed: 1,
    progress_total: 1,
    inserted_rows: 1,
    affected_patterns: ['predictions'],
  },
  {
    job_id: 'job-9841',
    job_type: 'clustering',
    status: 'success',
    started_at: '2026-11-08T09:36:00Z',
    finished_at: '2026-11-08T09:36:03Z',
    progress_completed: 1,
    progress_total: 1,
    inserted_rows: 1,
    affected_patterns: ['clustering'],
  },
  {
    job_id: 'job-9840',
    job_type: 'analysis',
    status: 'success',
    started_at: '2026-11-08T09:35:00Z',
    finished_at: '2026-11-08T09:35:12Z',
    progress_completed: 4,
    progress_total: 4,
    inserted_rows: 24,
    affected_patterns: ['time_series', 'trend_seasonal', 'correlations'],
  },
];

// ==========================================
// S11: ADMIN DEMO CONTROL MOCK
// ==========================================
export const mockDemoPreflight: DemoPreflight = {
  environment: 'staging',
  allow_delete: true,
  database_connected: true,
  model_ready: true,
  gcs_verified: true,
  counts: {
    bronze_rows: 342150,
    silver_rows: 341820,
    gold_metrics_rows: 6840,
    gold_trend_seasonal_rows: 6840,
    gold_correlations_rows: 36,
    gold_clustering_rows: 6840,
    gold_predictions_rows: 365,
    gold_classifications_rows: 365,
    model_registry_count: 4,
  },
};

export const mockPreviewDeleteResponse: PreviewDeleteResponse = {
  dry_run_id: 'dryrun-20261108-abc123',
  affected_tables: [
    'gold.time_series_metrics',
    'gold.trend_seasonal_components',
    'gold.correlations',
    'gold.cluster_assignments',
    'gold.predictions',
    'gold.classifications',
  ],
  row_count: 21286,
  protected_tables: [
    'bronze.stations',
    'bronze.source_files',
    'bronze.raw_observations',
    'silver.wave_observations',
    'silver.daily_features',
    'gold.model_registry',
    'gold.model_evaluations',
  ],
  safe_to_delete: true,
  expires_at: '2026-11-08T10:15:00Z',
};
