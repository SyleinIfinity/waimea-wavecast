import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import {
  calendarDates, csvCell, hstToday, monthlyQuality, parseOverview, summarize, validateRange,
} from './quality.ts'
import { createQualityMock } from './quality.mock.ts'

const range = { from: '2026-01-01', to: '2026-01-03' }
const day = (date, samples, valid, coverage) => ({ date_hst: date, sample_count: samples, valid_wave_count: valid, coverage_ratio: coverage })
const response = (daily = [], issues = []) => ({ status: 'ok', data: { daily, issues } })

test('Hawaii date stays on previous day before 10:00 UTC, including New Year', () => {
  assert.equal(hstToday(new Date('2026-01-01T09:59:59Z')), '2025-12-31')
  assert.equal(hstToday(new Date('2026-01-01T10:00:00Z')), '2026-01-01')
})

test('date ranges reject invalid dates, reverse ranges and overlong API windows', () => {
  assert.ok(validateRange({ from: '2026-02-30', to: '2026-03-01' }))
  assert.ok(validateRange({ from: '2026-01-03', to: '2026-01-01' }))
  assert.ok(validateRange({ from: '', to: '2026-01-01' }))
  assert.ok(validateRange({ from: '2024-01-01', to: '2026-01-01' }))
  assert.equal(validateRange({ from: '2024-01-01', to: '2024-12-31' }), null)
  assert.deepEqual(calendarDates({ from: '2024-02-28', to: '2024-03-01' }), ['2024-02-28', '2024-02-29', '2024-03-01'])
})

test('parse real overview envelope and numeric strings, preserving null and zero', () => {
  const parsed = parseOverview(response([
    day('2026-01-02', '10', '8', '0.5'),
    day('2026-01-01', 0, 0, 0),
    day('2026-01-03', 1, 0, null),
  ], [{ severity: 'warning', status: 'open', count: '2' }]), range)
  assert.deepEqual(parsed.daily.map(row => row.coverage_ratio), [0, 0.5, null])
  assert.equal(parsed.issues[0].count, 2)
  assert.equal(parsed.daily[1].sample_count, 10)
})

test('malformed DTO never silently becomes zero/empty, and dates must match query', () => {
  const invalid = [
    { data: { daily: [], issues: [] } },
    { status: 'ok', data: { items: [] } },
    response([day('2026-01-01', null, 0, null)]),
    response([day('2026-01-01', 2, 3, 0.5)]),
    response([day('2026-01-01', 2, 1, 50)]),
    response([day('2026-01-01', 2, 1, false)]),
    response([day('2026-01-01', 2, 1, 0.5), day('2026-01-01', 2, 1, 0.5)]),
    response([day('2025-12-31', 2, 1, 0.5)]),
    response([], [{ severity: 'critical', status: 'open', count: 1 }]),
  ]
  for (const value of invalid) assert.throws(() => parseOverview(value, range))
})

test('valid WVHT ratio is weighted by sample count; coverage excludes only null days', () => {
  const data = {
    daily: [day('2026-01-01', 2, 1, 0), day('2026-01-02', 8, 8, 1), day('2026-01-03', 0, 0, null)],
    issues: [{ severity: 'error', status: 'open', count: 3 }, { severity: 'info', status: 'resolved', count: 20 }],
  }
  const stats = summarize(data)
  assert.equal(stats.validRatio, 0.9)
  assert.equal(stats.meanCoverage, 0.5)
  assert.equal(stats.coverageDays, 2)
  assert.equal(stats.daysWithSamples, 2)
  assert.equal(stats.openIssues, 3)
})

test('empty and zero-sample datasets have undefined ratio, not misleading 0% quality', () => {
  assert.equal(summarize({ daily: [], issues: [] }).validRatio, null)
  assert.equal(summarize({ daily: [day('2026-01-01', 0, 0, null)], issues: [] }).meanCoverage, null)
  assert.deepEqual(parseOverview({ status: 'empty', data: { daily: [], issues: [] } }, range), { daily: [], issues: [] })
})

test('monthly overview preserves absent months and null-only coverage', () => {
  const rows = monthlyQuality([day('2026-01-01', 2, 1, null)], { from: '2026-01-01', to: '2026-02-02' })
  assert.equal(rows.length, 2)
  assert.equal(rows[0].days, 1)
  assert.equal(rows[0].meanCoverage, null)
  assert.equal(rows[1].days, 0)
  assert.equal(rows[1].meanCoverage, null)
})

test('fixture is deterministic, matches real DTO and covers missing/zero/null states', () => {
  const year = { from: '2026-01-01', to: '2026-12-31' }
  const mock = createQualityMock(year)
  assert.deepEqual(mock, createQualityMock(year))
  assert.deepEqual(parseOverview(response(mock.daily, mock.issues), year), mock)
  assert.ok(mock.daily.length < calendarDates(year).length)
  assert.ok(mock.daily.some(row => row.coverage_ratio === null))
  assert.ok(mock.daily.some(row => row.sample_count === 0))
  assert.deepEqual(createQualityMock({ from: '2005-01-01', to: '2005-01-31' }), { daily: [], issues: [] })
})

test('CSV retains empty values and numeric zero and escapes spreadsheet formulas/quotes', () => {
  assert.equal(csvCell(null), '""')
  assert.equal(csvCell(0), '0')
  assert.equal(csvCell('=1+1'), '"\'=1+1"')
  assert.equal(csvCell('a"b,c'), '"a""b,c"')
})

// Substitute Vite's build-time env and resolve the relative module in memory.
// Tests execute the actual adapter; no live backend and no files are emitted.
async function adapter(env) {
  let source = await readFile(new URL('./api.ts', import.meta.url), 'utf8')
  source = source.replaceAll('import.meta.env', JSON.stringify(env))
    .replace("from './quality'", `from '${new URL('./quality.ts', import.meta.url).href}'`)
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

test('API URL handles origin and /api/v1 suffix; production never enables fixture', async () => {
  const original = globalThis.fetch
  try {
    for (const url of ['https://example.test', 'https://example.test/api/v1/']) {
      const api = await adapter({ VITE_API_BASE_URL: url, VITE_USE_MOCK: 'true', DEV: false })
      assert.equal(api.qualityMockMode, false)
      let requested
      globalThis.fetch = async (url, options) => {
        requested = String(url)
        assert.equal(options.headers.Accept, 'application/json')
        return new Response(JSON.stringify(response([day(range.from, 2, 1, null)])))
      }
      const result = await api.loadQualityOverview(range)
      assert.equal(requested, 'https://example.test/api/v1/data-quality/overview?start_hst=2026-01-01&end_hst=2026-01-03')
      assert.equal(result.isMock, false)
    }
  } finally { globalThis.fetch = original }
})

test('HTTP errors and malformed payloads surface as errors, never mock fallback', async () => {
  const original = globalThis.fetch
  const api = await adapter({ VITE_API_BASE_URL: 'https://example.test', DEV: true })
  try {
    for (const status of [404, 422, 503]) {
      globalThis.fetch = async () => new Response('', { status })
      await assert.rejects(api.loadQualityOverview(range))
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'ok', data: {} }))
    await assert.rejects(api.loadQualityOverview(range), /data.daily/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(api.loadQualityOverview(range, controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
