// The bot check: off by default, strict when on, and it never lets a booking through without a valid token.
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { addDays, dowOf, nowParts } from '../shared/schedule.js'

const PORT = 8960 + Math.floor(Math.random() * 30)
const BASE = `http://localhost:${PORT}`
let api, mock, verifyCalls = [], mockUp = true

before(async () => {
  // a stand-in for Cloudflare's verification endpoint: only "good-token" passes
  mock = http.createServer((req, res) => {
    let b = ''
    req.on('data', (c) => (b += c))
    req.on('end', () => {
      const p = new URLSearchParams(b)
      verifyCalls.push(Object.fromEntries(p))
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ success: p.get('response') === 'good-token' && p.get('secret') === 'test-secret' }))
    })
  })
  await new Promise((r) => mock.listen(0, r))
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-'))
  api = spawn(process.execPath, ['dev-server.mjs'], {
    env: { ...process.env, API_PORT: String(PORT), DESK_PASSPHRASE: 'correct horse battery', DESK_DEV_STORE: path.join(tmp, 's.json'), TURNSTILE_SITE_KEY: 'site-key-123', TURNSTILE_SECRET_KEY: 'test-secret', TURNSTILE_VERIFY_URL: `http://localhost:${mock.address().port}/verify` },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  await new Promise((r) => api.stdout.on('data', (d) => String(d).includes('api on') && r()))
})
after(() => { api?.kill(); mock?.close() })

let n = 0
const day = () => { for (let i = 1; i <= 14; i++) { const d = addDays(nowParts().date, i); if (dowOf(d) === 1) return d } }
const book = (extra) => fetch(`${BASE}/api/public/book`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.5.5.${++n}` }, body: JSON.stringify({ name: 'Asha Patel', phone: '9876512345', type: 'follow', mode: 'clinic', date: day(), start: 600 + 30 * n, ...extra }) }).then(async (r) => ({ status: r.status, body: await r.json() }))

test('the public config tells the website which site key to use', async () => {
  const c = await (await fetch(`${BASE}/api/public/config`)).json()
  assert.equal(c.turnstile, 'site-key-123')
})

test('a booking with no check token is refused', async () => {
  const r = await book({})
  assert.equal(r.status, 400)
  assert.equal(r.body.error, 'bot_check')
})

test('a bad or oversized token is refused', async () => {
  assert.equal((await book({ cfToken: 'forged' })).body.error, 'bot_check')
  assert.equal((await book({ cfToken: 'x'.repeat(5000) })).body.error, 'bot_check')
  assert.equal((await book({ cfToken: { a: 1 } })).body.error, 'bot_check')
})

test('a good token books, and the secret + caller IP go to Cloudflare, never to the browser', async () => {
  verifyCalls = []
  const r = await book({ cfToken: 'good-token' })
  assert.equal(r.status, 201)
  assert.equal(verifyCalls.length, 1)
  assert.equal(verifyCalls[0].secret, 'test-secret')
  assert.equal(verifyCalls[0].response, 'good-token')
  assert.match(verifyCalls[0].remoteip, /^10\.5\.5\.\d+$/)
  assert.ok(!JSON.stringify(await (await fetch(`${BASE}/api/public/config`)).json()).includes('test-secret'))
})

test('if Cloudflare cannot be reached the booking is refused (fails closed), with a helpful message', async () => {
  mock.close()
  const r = await book({ cfToken: 'good-token' })
  assert.equal(r.status, 400)
  assert.equal(r.body.error, 'bot_unreachable')
  assert.match(r.body.message, /call the clinic/)
})

test('the doctor’s app is not affected by the check (her sign-in has its own protection)', async () => {
  const r = await fetch(`${BASE}/api/desk/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.6.6.6' }, body: JSON.stringify({ passphrase: 'correct horse battery' }) })
  assert.equal(r.status, 200)
})
