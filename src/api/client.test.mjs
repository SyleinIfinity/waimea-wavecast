import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = (await readFile(new URL('./client.ts', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env', JSON.stringify({ VITE_API_BASE_URL: 'https://api.example.test/api/v1' }))
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const client = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('empty forecast feeds return no fabricated forecasts', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'empty', data: [] }))
    assert.deepEqual(await client.getForwardForecasts(), [])
    assert.deepEqual(await client.getShadowForecasts('30d'), [])
    await assert.rejects(client.getModelRegistry(), /chưa có dữ liệu danh mục/)
  } finally { globalThis.fetch = original }
})

test('forecast feeds preserve real source, horizon and unevaluated nulls', async () => {
  const original = globalThis.fetch
  try {
    let requested = ''
    globalThis.fetch = async url => {
      requested = String(url)
      return new Response(JSON.stringify({ status: 'ok', quality_status: 'experimental', data: [{
        forecast_id: 42, model_id: 26, model_version: 'v1.5', horizon: '30d',
        target_kind: 'hst_day_median_wvht', issued_at: '2026-11-14T12:00:00Z',
        target_at: '2026-12-14T12:00:00Z', target_date_hst: '2026-12-14',
        predicted_value: 2.3, actual_value: null, absolute_error: null, evaluated_at: null,
      }] }))
    }
    const rows = await client.getShadowForecasts('30d')
    assert.match(requested, /forecasts\/shadow\/latest\?horizon=30d&limit=30$/)
    assert.equal(rows[0].source, 'shadow')
    assert.equal(rows[0].quality_status, 'experimental')
    assert.equal(rows[0].horizon, '30d')
    assert.equal(rows[0].actual_value, null)
    assert.equal(rows[0].absolute_error, null)
  } finally { globalThis.fetch = original }
})

test('malformed forecast data is rejected', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'ok', data: [{ forecast_id: 1 }] }))
    await assert.rejects(client.getForwardForecasts(), /thiếu trường bắt buộc/)
  } finally { globalThis.fetch = original }
})

test('HTTP errors are surfaced, including unavailable admin and evaluation APIs', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('', { status: 403 })
    await assert.rejects(client.getPipelineStatus(), /HTTP 403/)
    globalThis.fetch = async () => new Response('', { status: 404 })
    await assert.rejects(client.getConfusionMatrix(), /HTTP 404/)
  } finally { globalThis.fetch = original }
})

test('configured API URL is used for real observation requests', async () => {
  const original = globalThis.fetch
  try {
    let requested = ''
    globalThis.fetch = async url => {
      requested = String(url)
      return new Response(JSON.stringify({ status: 'ok', data_type: 'observation', data: { station_id: '51201' } }))
    }
    await client.loadLatest()
    assert.equal(requested, 'https://api.example.test/api/v1/observations/latest')
  } finally { globalThis.fetch = original }
})
