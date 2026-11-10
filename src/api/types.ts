export type LatestObservation = {
  station_id: string; source: string; observed_at: string;
  wave_height_m: number | null; dominant_period_s: number | null;
  wave_direction_deg: number | null; sea_temperature_c: number | null;
  quality_flag: string;
}
export type LatestResponse = {
  status: 'ok' | 'empty'; data_type: 'observation'; data: LatestObservation | null;
}
