// Browser test of the bot check on the booking form, with Cloudflare's script replaced by a stub.
// Needs: `npm run build` first. Run: node test/turnstile.e2e.mjs
import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? '  ✓' : '  ✗ FAIL'} ${m}`) }
const BASE = 'http://localhost:4173'

const mock = http.createServer((req, res) => {
  let b = ''
  req.on('data', (c) => (b += c))
  req.on('end', () => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ success: new URLSearchParams(b).get('response') === 'good-token' })) })
})
await new Promise((r) => mock.listen(0, r))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tse2e-'))
const api = spawn(process.execPath, ['dev-server.mjs'], { env: { ...process.env, API_PORT: '8787', DESK_PASSPHRASE: 'correct horse battery', DESK_ORIGIN: BASE, DESK_DEV_STORE: path.join(tmp, 's.json'), TURNSTILE_SITE_KEY: 'site-key-123', TURNSTILE_SECRET_KEY: 's', TURNSTILE_VERIFY_URL: `http://localhost:${mock.address().port}/v` }, stdio: ['ignore', 'pipe', 'inherit'] })
const prev = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => api.stdout.on('data', (d) => String(d).includes('api on') && r()))
await new Promise((r) => setTimeout(r, 2500))

const STUB = `window.turnstile = { n: 0, render(el, o) { window.__ts = { cb: o.callback, key: o.sitekey, appearance: o.appearance, renders: (window.__ts?.renders || 0) + 1 }; return 'w' + (++this.n) }, remove() { window.__removed = (window.__removed || 0) + 1 }, reset() {} }`
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const open = async (script) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage(); page.setDefaultTimeout(40000)
  await page.route('https://challenges.cloudflare.com/**', (r) => (script === 'blocked' ? r.abort() : r.fulfill({ contentType: 'text/javascript', body: STUB })))
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('.loader', { state: 'detached', timeout: 40000 }).catch(() => {})
  await page.evaluate(() => document.getElementById('visit').scrollIntoView())
  await page.waitForSelector('.time-grid .tm')
  return { ctx, page, errs }
}
const fill = async (page) => {
  await page.locator('.time-grid .tm').first().click()
  await page.fill('input[autocomplete=name]', 'Asha Patel')
  await page.fill('input[type=tel]', '9876543210')
}

console.log('1. widget')
{
  const { ctx, page, errs } = await open()
  await page.waitForFunction(() => window.__ts)
  ok((await page.evaluate(() => window.__ts.key)) === 'site-key-123', 'widget uses the site key from the server')
  ok((await page.evaluate(() => window.__ts.appearance)) === 'interaction-only', 'it stays invisible unless Cloudflare needs to ask')
  await fill(page)
  await page.click('button[type=submit]')
  await page.waitForSelector('.book .err:has-text("safety check")')
  ok((await page.locator('.book-done').count()) === 0, 'pressing book before the check finishes does not send anything')
  await page.evaluate(() => window.__ts.cb('good-token'))
  await page.click('button[type=submit]')
  await page.waitForSelector('.book-done')
  ok(true, 'once the check passes, the booking goes through')
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''))

  console.log('2. a rejected token')
  await page.click('button:has-text("Book another")')
  await page.waitForSelector('.time-grid .tm')
  await page.waitForFunction(() => window.__ts.renders >= 2)
  await fill(page)
  await page.evaluate(() => window.__ts.cb('forged-token'))
  const before = await page.evaluate(() => window.__ts.renders)
  await page.click('button[type=submit]')
  await page.waitForSelector('.book .err:has-text("quick check")')
  ok(true, 'a bad token shows "complete the quick check" and nothing is booked')
  await page.waitForFunction((b) => window.__ts.renders > b, before)
  ok(true, 'a fresh check is created for the retry (each token works only once)')
  await page.click('button[type=submit]')
  await page.waitForSelector('.book .err:has-text("safety check")')
  ok(true, 'the used-up token is not re-sent')
  await ctx.close()
}

console.log('3. ad-blocker / Cloudflare unreachable in the browser')
{
  const { ctx, page } = await open('blocked')
  await fill(page)
  await page.click('button[type=submit]')
  await page.waitForSelector('.book .err:has-text("could not load")')
  ok(/call the clinic/.test(await page.locator('.book .err').first().textContent()), 'patient is told to turn off the blocker or call the clinic')
  await ctx.close()
}

await browser.close(); api.kill(); prev.kill(); mock.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
