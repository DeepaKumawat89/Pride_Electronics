import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const workspace = new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1')
const appPort = 4176
const debugPort = 9338
const baseUrl = `http://127.0.0.1:${appPort}`

const browserCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const browserPath = browserCandidates.find(existsSync)

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitForUrl(url, timeout = 20_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch {}
    await delay(200)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

class DevToolsClient {
  constructor(url) {
    this.socket = new WebSocket(url)
    this.nextId = 1
    this.pending = new Map()
    this.events = []
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (message.id) {
        const request = this.pending.get(message.id)
        if (!request) return
        this.pending.delete(message.id)
        if (message.error) request.reject(new Error(message.error.message))
        else request.resolve(message.result)
        return
      }
      this.events.push(message)
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Browser evaluation failed')
    }
    return result.result.value
  }

  close() {
    this.socket.close()
  }
}

test('storefront and admin render responsively without browser console errors', {
  skip: browserPath ? false : 'Chrome or Edge is not installed',
  timeout: 90_000,
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), 'pride-browser-smoke-'))
  const viteOutput = []
  const chromeOutput = []
  const vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', `--host=127.0.0.1`, `--port=${appPort}`],
    { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  )
  vite.stdout.on('data', (value) => viteOutput.push(String(value)))
  vite.stderr.on('data', (value) => viteOutput.push(String(value)))
  let browser
  let client
  try {
    await waitForUrl(baseUrl)
    browser = spawn(browserPath, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    browser.stderr.on('data', (value) => chromeOutput.push(String(value)))
    const targets = await waitForUrl(`http://127.0.0.1:${debugPort}/json/list`)
      .then((response) => response.json())
    const page = targets.find((target) => target.type === 'page')
    assert.ok(page?.webSocketDebuggerUrl, 'Chrome did not expose a page target')
    client = new DevToolsClient(page.webSocketDebuggerUrl)
    await client.connect()
    await Promise.all([
      client.send('Page.enable'),
      client.send('Runtime.enable'),
      client.send('Log.enable'),
    ])

    for (const [width, height] of [[390, 844], [820, 1180], [1440, 1000]]) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
      })
      await client.send('Page.navigate', { url: baseUrl })
      await delay(4_000)
      const layout = await client.evaluate(`({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        text: document.body.innerText.slice(0, 3000)
      })`)
      assert.equal(layout.width, width)
      assert.ok(layout.scrollWidth <= width + 2, `${width}px layout overflows horizontally`)
      assert.match(layout.text, /Pride|Power your|Shop collection/i)
      assert.doesNotMatch(layout.text, /Unable to load|Something went wrong/i)
    }

    await client.send('Page.navigate', { url: `${baseUrl}/#products` })
    await delay(8_000)
    const catalog = await client.evaluate(`({
      text: document.body.innerText,
      searchInputs: document.querySelectorAll('input[aria-label="Search products"]').length,
      cards: document.querySelectorAll('button[aria-label^="View details for"]').length,
      scrollWidth: document.documentElement.scrollWidth,
      width: window.innerWidth
    })`)
    assert.match(catalog.text, /All products/i)
    assert.ok(catalog.searchInputs > 0, 'Catalog search did not render')
    assert.ok(catalog.cards > 0, 'The existing Firestore catalog did not render any product cards')
    assert.ok(catalog.scrollWidth <= catalog.width + 2, 'Catalog overflows horizontally')
    assert.doesNotMatch(catalog.text, /Unable to load|Something went wrong/i)

    if (catalog.cards > 0) {
      await client.evaluate(`document.querySelector('button[aria-label^="View details for"]').click()`)
      await delay(2_000)
      const details = await client.evaluate(`({
        text: document.body.innerText,
        hasHeading: Boolean(document.querySelector('h1')),
        hasCartAction: [...document.querySelectorAll('button')].some((button) => /Add to cart|Select a variant/.test(button.innerText))
      })`)
      assert.equal(details.hasHeading, true)
      assert.equal(details.hasCartAction, true)
      assert.doesNotMatch(details.text, /Unable to load|Something went wrong/i)
    }

    await client.send('Page.navigate', { url: `${baseUrl}/admin` })
    await delay(2_000)
    const admin = await client.evaluate(`({
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      width: window.innerWidth
    })`)
    assert.match(admin.text, /Admin sign in/i)
    assert.ok(admin.scrollWidth <= admin.width + 2, 'Admin sign-in overflows horizontally')

    const browserErrors = client.events.filter(({ method, params }) =>
      method === 'Runtime.exceptionThrown' ||
      (method === 'Runtime.consoleAPICalled' && params.type === 'error') ||
      (method === 'Log.entryAdded' && params.entry?.level === 'error'),
    )
    assert.deepEqual(browserErrors, [], `Browser errors: ${JSON.stringify(browserErrors)}`)
    assert.equal(viteOutput.some((line) => /\berror\b/i.test(line)), false)
  } finally {
    client?.close()
    browser?.kill()
    vite.kill()
    if (chromeOutput.some((line) => /FATAL/i.test(line))) {
      throw new Error(chromeOutput.join(''))
    }
  }
})
