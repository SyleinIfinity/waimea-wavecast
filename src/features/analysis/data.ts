export const METRICS = ['WVHT', 'DPD', 'APD', 'WSPD', 'WTMP'] as const;
export type Metric = typeof METRICS[number];
export type Method = 'pearson' | 'spearman';
export type Observation = { observed_at: string; values: Record<Metric, number | null> };
export type CorrelationSample = {
  rows: Observation[];
  first_at: string;
  last_at: string;
  truncated: boolean;
};
export type CorrelationCell = {
  x: Metric;
  y: Metric;
  coefficient: number | null;
  paired_count: number;
};

const FIELDS: Record<Metric, string> = {
  WVHT: 'wave_height_m', DPD: 'dominant_period_s', APD: 'average_period_s',
  WSPD: 'wind_speed_ms', WTMP: 'sea_surface_temp_c',
};
const rawBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const base = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;
const PAGE_LIMIT = 1000;
const MAX_PAGES = 5;

function nullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function loadCorrelationSample(signal?: AbortSignal): Promise<CorrelationSample> {
  if (!rawBase) throw new Error('Chưa cấu hình VITE_API_BASE_URL.');
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  const all: Observation[] = [];
  const cursors = new Set<string>();
  let cursor: string | null = null;
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), limit: String(PAGE_LIMIT) });
    if (cursor) query.set('cursor', cursor);
    const response = await fetch(`${base}/observations?${query}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Backend observations trả về HTTP ${response.status}.`);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Phản hồi observations không hợp lệ.');
    const envelope = body as Record<string, unknown>;
    if (!['ok', 'empty'].includes(String(envelope.status)) || !Array.isArray(envelope.data)) {
      throw new Error('Backend chưa trả về danh sách observations hợp lệ.');
    }
    for (const item of envelope.data) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Bản ghi quan trắc không hợp lệ.');
      const row = item as Record<string, unknown>;
      if (row.quality_status !== 'valid') continue;
      if (typeof row.observed_at !== 'string' || !Number.isFinite(Date.parse(row.observed_at))) {
        throw new Error('Bản ghi quan trắc thiếu thời điểm hợp lệ.');
      }
      const values = {} as Record<Metric, number | null>;
      for (const metric of METRICS) values[metric] = nullableNumber(row[FIELDS[metric]]);
      all.push({ observed_at: row.observed_at, values });
    }
    if (!envelope.has_more) break;
    const next = envelope.next_cursor;
    if (typeof next !== 'string' || !next || cursors.has(next)) throw new Error('Cursor phân trang observations không hợp lệ.');
    cursors.add(next);
    cursor = next;
    if (page === MAX_PAGES - 1) truncated = true;
  }
  const rows = [...new Map(all.map(row => [row.observed_at, row])).values()]
    .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  if (rows.length < 3) throw new Error('Backend chưa có đủ quan trắc QC valid trong 30 ngày gần nhất.');
  return { rows, first_at: rows[0].observed_at, last_at: rows[rows.length - 1].observed_at, truncated };
}

function ranks(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  for (let start = 0; start < indexed.length;) {
    let end = start + 1;
    while (end < indexed.length && indexed[end].value === indexed[start].value) end++;
    const averageRank = (start + 1 + end) / 2;
    for (let i = start; i < end; i++) result[indexed[i].index] = averageRank;
    start = end;
  }
  return result;
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;
  xs.forEach((value, index) => {
    const dx = value - xMean;
    const dy = ys[index] - yMean;
    covariance += dx * dy;
    xVariance += dx * dx;
    yVariance += dy * dy;
  });
  if (xVariance === 0 || yVariance === 0) return null;
  return Math.max(-1, Math.min(1, covariance / Math.sqrt(xVariance * yVariance)));
}

export function correlationCell(rows: Observation[], x: Metric, y: Metric, method: Method): CorrelationCell {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rows) {
    const vx = row.values[x];
    const vy = row.values[y];
    if (vx !== null && vy !== null) { xs.push(vx); ys.push(vy); }
  }
  const coefficient = method === 'spearman' ? pearson(ranks(xs), ranks(ys)) : pearson(xs, ys);
  return { x, y, coefficient, paired_count: xs.length };
}

export function correlationMatrix(rows: Observation[], method: Method): CorrelationCell[][] {
  return METRICS.map(x => METRICS.map(y => correlationCell(rows, x, y, method)));
}

export function scatterPoints(rows: Observation[], x: Metric, y: Metric): { x: number; y: number; observed_at: string }[] {
  return rows.flatMap(row => {
    const vx = row.values[x];
    const vy = row.values[y];
    return vx === null || vy === null ? [] : [{ x: vx, y: vy, observed_at: row.observed_at }];
  });
}
