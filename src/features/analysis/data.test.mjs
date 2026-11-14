import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = (await readFile(new URL('./data.ts', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env', JSON.stringify({ VITE_API_BASE_URL: 'https://api.example.test/api/v1' }))
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const analysis = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

function row(x, y) {
  return { observed_at: '2026-11-14T12:00:00Z', values: { WVHT: x, DPD: y, APD: null, WSPD: null, WTMP: null } }
}

test('Pearson and Spearman use paired observations and handle ties', () => {
  const rows = [row(1, 4), row(2, 3), row(3, 2), row(4, 1)]
  assert.equal(analysis.correlationCell(rows, 'WVHT', 'DPD', 'pearson').coefficient, -1)
  assert.equal(analysis.correlationCell(rows, 'WVHT', 'DPD', 'spearman').coefficient, -1)
  const withMissing = [...rows, row(5, null)]
  assert.equal(analysis.correlationCell(withMissing, 'WVHT', 'DPD', 'pearson').paired_count, 4)
  assert.equal(analysis.correlationCell(rows, 'WVHT', 'APD', 'pearson').coefficient, null)
  const tied = [row(1, 1), row(2, 1), row(3, 2), row(4, 2)]
  assert.ok(Math.abs(analysis.correlationCell(tied, 'WVHT', 'DPD', 'spearman').coefficient - 0.8944271909999159) < 1e-12)
})

test('Silver pagination keeps QC valid rows and preserves missing values', async () => {
  const original = globalThis.fetch
  const calls = []
  const measurement = (time, height, quality = 'valid') => ({
    observed_at: time, quality_status: quality, wave_height_m: height,
    dominant_period_s: 8, average_period_s: null, wind_speed_ms: 2,
    sea_surface_temp_c: 25,
  })
  try {
    globalThis.fetch = async url => {
      calls.push(String(url))
      const first = calls.length === 1
      return new Response(JSON.stringify(first
        ? { status: 'ok', data: [measurement('2026-11-14T12:00:00Z', 3), measurement('2026-11-14T11:30:00Z', 2, 'suspect')], has_more: true, next_cursor: '2026-11-14T11:30:00Z' }
        : { status: 'ok', data: [measurement('2026-11-14T11:00:00Z', 2), measurement('2026-11-14T10:30:00Z', 1)], has_more: false, next_cursor: null }))
    }
    const sample = await analysis.loadCorrelationSample()
    assert.equal(sample.rows.length, 3)
    assert.equal(sample.rows[0].values.APD, null)
    assert.equal(sample.rows[2].values.WVHT, 3)
    assert.match(calls[1], /cursor=2026-11-14T11%3A30%3A00Z/)
    assert.equal(sample.truncated, false)
  } finally { globalThis.fetch = original }
})

test('empty Silver data reports unavailable instead of constructing a matrix', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'empty', data: [], has_more: false }))
    await assert.rejects(analysis.loadCorrelationSample(), /chưa có đủ quan trắc/)
  } finally { globalThis.fetch = original }
})
