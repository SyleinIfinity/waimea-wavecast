import { createServer } from 'node:http'
import { readFile, mkdtemp, writeFile, readdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { createQualityMock } from './quality.mock.ts'

// Run from the frontend root after npm run build. This serves local fixtures,
// never the live NOAA/API service. S09_BROWSER_PATH can override Chrome's path.

const artifacts = await mkdtemp(resolve(tmpdir(), 'waimea-s09-check-'))
const root = resolve('dist')
let scenario = 'ready'
const requests = []
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/api/v1/data-quality/overview') {
      requests.push(url.search)
      res.setHeader('Content-Type', 'application/json')
      if (scenario === 'error') { res.writeHead(503); res.end('{}'); return }
      const data = scenario === 'empty' ? { daily: [], issues: [] } : createQualityMock({ from: url.searchParams.get('start_hst'), to: url.searchParams.get('end_hst') })
      res.end(JSON.stringify({ status: scenario === 'empty' ? 'empty' : 'ok', data })); return
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream')
    res.end(await readFile(path))
  } catch { res.writeHead(404); res.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const browser = spawn(process.env.S09_BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${resolve(artifacts, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
const socketUrl = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Chrome startup timeout')), 20000)
  browser.once('error', reject)
  browser.stderr.on('data', chunk => { const match = String(chunk).match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timeout); resolve(match[1]) } })
})
const socket = new WebSocket(socketUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
const exceptions = []
socket.addEventListener('message', event => {
  const data = JSON.parse(String(event.data))
  if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails.text)
  if (data.id && pending.has(data.id)) {
    const { resolve, reject, timer } = pending.get(data.id); clearTimeout(timer); pending.delete(data.id)
    data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result)
  }
})
function command(method, params = {}, sessionId) {
  const next = ++id
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(next); reject(new Error('CDP timeout: ' + method)) }, 15000)
    pending.set(next, { resolve, reject, timer }); socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}
let session
const evaluate = async expression => {
  const value = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session)
  if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails))
  return value.result.value
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(expression) {
  for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100) }
  throw new Error('UI timeout: ' + expression)
}
const clickText = text => evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes(${JSON.stringify(text)}))?.click()`)
const clickLabel = label => evaluate(`document.querySelector('button[aria-label=${JSON.stringify(label)}]')?.click()`)
try {
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' })
  session = (await command('Target.attachToTarget', { targetId, flatten: true })).sessionId
  await command('Runtime.enable', {}, session)
  await command('Page.enable', {}, session)
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts })
  await command('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false }, session)
  await command('Page.navigate', { url: `http://127.0.0.1:${port}` }, session)
  await until(`document.querySelector('nav') && document.querySelector('nav').textContent.includes('Chất lượng và nguồn gốc dữ liệu')`)
  await clickText('Chất lượng và nguồn gốc dữ liệu')
  await until(`document.querySelector('h1')?.textContent.includes('Data Quality') && document.body.textContent.includes('BACKEND DATA')`)
  await until(`document.querySelector('svg[_echarts_instance_]') || document.querySelector('main svg path')`)
  await pause(700)
  assert.ok(requests.at(-1).includes('start_hst='))
  assert.equal(await evaluate(`document.querySelectorAll('main table').length`), 2)
  await clickText('Xuất CSV ngày')
  await pause(400)
  assert.ok((await readdir(artifacts)).some(name => name.endsWith('.csv')))
  const screenshot = await command('Page.captureScreenshot', { format: 'png' }, session)
  await writeFile(resolve(artifacts, 's09-desktop.png'), Buffer.from(screenshot.data, 'base64'))
  await evaluate(`document.querySelector('main').scrollTop = 1100`)
  await pause(400)
  const chartScreenshot = await command('Page.captureScreenshot', { format: 'png' }, session)
  await writeFile(resolve(artifacts, 's09-charts.png'), Buffer.from(chartScreenshot.data, 'base64'))
  await evaluate(`document.querySelector('main').scrollTop = 0`)
  await clickText('Tiếp')
  assert.ok(await evaluate(`document.body.textContent.includes('Trang 2/')`))
  await evaluate(`const select = document.getElementById('s09-day-filter'); select.value = 'unknown'; select.dispatchEvent(new Event('change', { bubbles: true }))`)
  await until(`document.querySelector('main table tbody')?.textContent.includes('Coverage chưa xác định')`)
  scenario = 'error'
  await clickText('Làm mới')
  await until(`document.body.textContent.includes('Không thể tải chất lượng dữ liệu')`)
  assert.equal(await evaluate(`document.querySelectorAll('main table').length`), 0)
  scenario = 'empty'
  await clickText('Thử lại')
  await until(`document.body.textContent.includes('EMPTY DATA')`)
  assert.ok(await evaluate(`document.body.textContent.includes('Chưa có thống kê chất lượng')`))
  scenario = 'ready'
  await clickText('Làm mới')
  await until(`document.body.textContent.includes('BACKEND DATA')`)
  await command('Emulation.setDeviceMetricsOverride', { width: 360, height: 900, deviceScaleFactor: 1, mobile: true }, session)
  await pause(400)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('aside')).display`), 'none')
  await clickLabel('Mở menu điều hướng')
  await until(`getComputedStyle(document.querySelector('aside')).display !== 'none'`)
  await clickText('Chất lượng và nguồn gốc dữ liệu')
  await until(`getComputedStyle(document.querySelector('aside')).display === 'none'`)
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= 360`))
  assert.ok(await evaluate(`document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1`))
  const mobile = await command('Page.captureScreenshot', { format: 'png' }, session)
  await writeFile(resolve(artifacts, 's09-mobile.png'), Buffer.from(mobile.data, 'base64'))
  assert.deepEqual(exceptions, [])
  console.log(JSON.stringify({ result: 'PASS', checks: ['S09 navigation', 'API overview render', 'CSV download', 'pagination', 'coverage filter', '503 and retry', 'empty state', '360px drawer and no page overflow', 'no uncaught JS exceptions'], artifacts }))
} finally {
  await command('Browser.close').catch(() => {})
  socket.close(); browser.kill(); server.close()
}
