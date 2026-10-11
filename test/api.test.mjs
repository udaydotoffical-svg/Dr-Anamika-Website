// Backend tests. Run: npm run test:api                    (file store)
//                     BACKEND=upstash npm run test:api    (through a mock of the Upstash REST API)
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startMockUpstash } from './mock-upstash.mjs'
import { addDays, dowOf, nowParts } from '../shared/schedule.js'

const PASS = 'correct horse battery'
const PORT = 8800 + Math.floor(Math.random() * 150)
const BASE = `http://localhost:${PORT}`
let child, mock, tmp
let ipN = 0
const nextIp = () => `10.1.${Math.floor(++ipN / 250)}.${ipN % 250}` // each test group gets its own rate-limit bucket

const call = async (method, p, { body, cookie, ip = nextIp() } = {}) => {
  const res = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, headers: res.headers }
}
const login = async (ip) => {
  const r = await call('POST', '/api/desk/login', { body: { passphrase: PASS }, ip })
  assert.equal(r.status, 200)
  return r.headers.get('set-cookie').split(';')[0]
}
// Mondays keep slot maths deterministic: clinic 10:00–14:00 and 17:30–20:00.
// Every weekday occurs exactly twice in the 14 days patients can book. n < 10 -> first, n >= 10 -> second.
const futureDow = (dow, n) => { const out = []; for (let i = 1; i <= 14; i++) { const d = addDays(nowParts().date, i); if (dowOf(d) === dow) out.push(d) } return out[n >= 10 ? 1 : 0] }
const person = (n, extra = {}) => ({ name: 'Asha Patel', phone: `98765${String(10000 + n).slice(-5)}`, type: 'new', mode: 'clinic', ...extra })
const book = (date, start, n, extra = {}, ip) => call('POST', '/api/public/book', { body: { ...person(n), date, start, ...extra }, ip })
const slots = async (date, type = 'new', mode = 'clinic') => (await call('GET', `/api/public/slots?date=${date}&type=${type}&mode=${mode}`)).data.slots

before(async () => {
  const env = { ...process.env, API_PORT: String(PORT), DESK_PASSPHRASE: PASS }
  if (process.env.BACKEND === 'upstash') {
    mock = await startMockUpstash()
    env.UPSTASH_REDIS_REST_URL = mock.url
    env.UPSTASH_REDIS_REST_TOKEN = mock.token
  } else {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-'))
    env.DESK_DEV_STORE = path.join(tmp, 'store.json')
  }
  child = spawn(process.execPath, ['dev-server.mjs'], { env, stdio: ['ignore', 'pipe', 'inherit'] })
  await new Promise((resolve) => child.stdout.on('data', (d) => String(d).includes('api on') && resolve()))
})
after(() => { child?.kill(); mock?.close() })

test('config says enabled and lists the visit types with durations', async () => {
  const r = await call('GET', '/api/public/config')
  assert.equal(r.data.enabled, true)
  assert.deepEqual(r.data.types.map((t) => [t.key, t.dur]), [['new', 60], ['follow', 30], ['counsel', 60]])
})

test('slots follow the clinic hours', async () => {
  const mon = futureDow(1, 10)
  assert.deepEqual(await slots(mon), [600, 630, 660, 690, 720, 750, 780, 1050, 1080, 1110, 1140]) // 60-min visits fit before 2 pm / 8 pm
  assert.deepEqual((await slots(mon, 'follow')).slice(-3), [1110, 1140, 1170]) // 30-min visits: last start 7:30 pm
  const sun = futureDow(0, 10)
  assert.equal((await slots(sun)).at(-1), 1170) // Sunday evening runs until 8:30 pm
  assert.deepEqual(await slots(mon, 'new', 'online'), [540, 570, 600, 630, 660, 690, 720]) // online 9 am – 1 pm
  assert.deepEqual(await slots('2020-01-06'), []) // past days have nothing
})

test('today never offers a time that has already started or is inside the lead time', async () => {
  const now = nowParts()
  for (const s of await slots(now.date, 'follow')) assert.ok(s >= now.minutes + 60, `slot ${s} is too soon (now ${now.minutes})`)
})

test('availability lists today + 14 days', async () => {
  const r = await call('GET', '/api/public/availability?type=new&mode=clinic')
  assert.equal(r.data.days.length, 15)
  assert.equal(r.data.days[0].date, nowParts().date)
})

test('a booking is created pending and takes the slot away', async () => {
  const d = futureDow(1, 4)
  const r = await book(d, 600, 1)
  assert.equal(r.status, 201)
  assert.equal(r.data.status, 'pending')
  assert.equal(r.data.firstName, 'Asha')
  assert.ok(r.data.ref && r.data.ref.length >= 14)
  assert.ok(!(await slots(d)).includes(600))
  assert.ok(!(await slots(d)).includes(630)) // a 60-minute visit also holds the next half hour
  assert.ok((await slots(d)).includes(660))
  assert.equal((await book(d, 600, 2)).status, 409)
})

test('overlap is caught: a 30-min visit inside an hour-long booking is refused', async () => {
  const d = futureDow(2, 4)
  assert.equal((await book(d, 600, 3)).status, 201)
  const r = await book(d, 630, 4, { type: 'follow' })
  assert.equal(r.status, 409)
  assert.equal(r.data.error, 'slot_taken')
  assert.equal((await book(d, 660, 4, { type: 'follow' })).status, 201)
})

test('RACE: 12 people tap the same slot at the same moment, exactly one wins', async () => {
  const d = futureDow(3, 4)
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => book(d, 1050, 100 + i)))
  assert.equal(results.filter((r) => r.status === 201).length, 1)
  assert.equal(results.filter((r) => r.status === 409).length, 11)
  assert.ok(!(await slots(d)).includes(1050))
})

test('RACE: overlapping starts (600, 630, 660 of 60 min) never double-book a half hour', async () => {
  const d = futureDow(4, 4)
  const results = await Promise.all([600, 630, 660, 630, 600].map((s, i) => book(d, s, 200 + i)))
  const won = results.map((r, i) => (r.status === 201 ? [600, 630, 660, 630, 600][i] : null)).filter((x) => x !== null)
  const marks = won.flatMap((s) => [s, s + 30])
  assert.equal(new Set(marks).size, marks.length, 'two bookings share a half hour: ' + won)
})

test('input checks: bad phone, name, type, time, mode and dates are refused', async () => {
  const d = futureDow(5, 4)
  for (const [extra, code] of [
    [{ phone: '12345' }, 'bad_phone'], [{ phone: '5876543210' }, 'bad_phone'], [{ name: 'A' }, 'bad_name'], [{ type: 'magic' }, 'bad_type'],
    [{ date: 'tomorrow' }, 'bad_date'], [{ date: '2020-01-06' }, 'past'], [{ date: addDays(nowParts().date, 40) }, 'too_far'],
  ]) {
    const r = await book(d, 600, 5, extra)
    assert.equal(r.status, 400, JSON.stringify(extra))
    assert.equal(r.data.error, code, JSON.stringify(extra))
  }
  assert.equal((await book(d, 601, 5)).status, 400) // not on the half hour
  assert.equal((await book(d, 700 + 0.5, 5)).status, 400)
  assert.equal((await book(d, 480, 5)).status, 409) // 8:00 am: clinic is closed
  assert.equal((await book(d, 840, 5)).status, 409) // 2 pm: a 60-min visit would run past closing
})

test('names are cleaned: no markup or control characters are stored', async () => {
  const d = futureDow(5, 6)
  const r = await book(d, 600, 6, { name: '<script>alert(1)</script>\u0007 Ravi', note: '<b>hi</b>\n\nthere' })
  assert.equal(r.status, 201)
  const cookie = await login()
  const list = await call('GET', `/api/desk/list?from=${d}&to=${d}`, { cookie })
  const b = list.data.bookings.find((x) => x.id)
  assert.ok(!/[<>\u0007]/.test(b.name + b.note), b.name + ' | ' + b.note)
})

test('phone formats +91, 0 and spaces are accepted and normalised', async () => {
  const d = futureDow(6, 4)
  for (const [i, phone] of ['+91 98765 43210', '098765 43211', '9876543212'].entries()) {
    const r = await book(d, 600 + i * 60, 300 + i, { phone })
    assert.equal(r.status, 201, phone)
  }
  const cookie = await login()
  const list = await call('GET', `/api/desk/list?from=${d}&to=${d}`, { cookie })
  assert.deepEqual(list.data.bookings.map((b) => b.phone).sort(), ['9876543210', '9876543211', '9876543212'])
})

test('the same phone number is limited to 3 upcoming appointments', async () => {
  const d = futureDow(1, 11)
  for (let i = 0; i < 3; i++) assert.equal((await book(d, 600 + i * 60 > 780 ? 1050 : 600 + i * 60, 0, { phone: '9000000001' })).status, 201)
  const r = await book(futureDow(2, 11), 600, 0, { phone: '9000000001' })
  assert.equal(r.status, 429)
  assert.equal(r.data.error, 'too_many')
})

test('honeypot: a bot gets a fake success and nothing is booked', async () => {
  const d = futureDow(2, 12)
  const r = await book(d, 600, 7, { trap: 'http://spam' })
  assert.equal(r.status, 200)
  assert.ok((await slots(d)).includes(600))
})

test('rate limit: the 7th booking attempt from one device in an hour is refused', async () => {
  const ip = '10.9.9.9'
  const d = futureDow(4, 12)
  const out = []
  for (let i = 0; i < 7; i++) out.push((await book(d, 600 + i * 30, 400 + i, { type: 'follow', phone: `9111111${100 + i}` }, ip)).status)
  assert.deepEqual(out.slice(0, 6), [201, 201, 201, 201, 201, 201])
  assert.equal(out[6], 429)
})

test('public status shows only safe fields; patient can cancel and the time is freed', async () => {
  const d = futureDow(3, 12)
  const r = await book(d, 1050, 8)
  assert.equal(r.status, 201)
  const st = await call('GET', `/api/public/status?ref=${r.data.ref}`)
  assert.deepEqual(Object.keys(st.data).sort(), ['cancelledBy', 'date', 'dur', 'firstName', 'mode', 'ref', 'start', 'status', 'type'])
  assert.ok(!JSON.stringify(st.data).includes('9876'))
  assert.equal((await call('GET', '/api/public/status?ref=nope')).status, 404)
  const c = await call('POST', '/api/public/cancel', { body: { ref: r.data.ref } })
  assert.equal(c.data.status, 'cancelled')
  assert.equal(c.data.cancelledBy, 'patient')
  assert.ok((await slots(d)).includes(1050))
  assert.equal((await call('POST', '/api/public/cancel', { body: { ref: r.data.ref } })).status, 409)
})

test('calendar file (.ics) downloads for a booking', async () => {
  const d = futureDow(5, 12)
  const r = await book(d, 600, 9)
  const ics = await call('GET', `/api/public/ics?ref=${r.data.ref}`)
  assert.match(ics.data, /BEGIN:VCALENDAR/)
  assert.match(ics.data, new RegExp(`DTSTART;TZID=Asia/Kolkata:${d.replace(/-/g, '')}T100000`))
  assert.match(ics.data, /DTEND;TZID=Asia\/Kolkata:\d{8}T110000/)
})

test('DESK: nothing works without signing in', async () => {
  for (const p of ['list', 'settings']) assert.equal((await call('GET', `/api/desk/${p}`)).status, 401, p)
  for (const p of ['update', 'create', 'block', 'unblock', 'settings', 'signout-all', 'push-subscribe', 'passkey-reg-options']) assert.equal((await call('POST', `/api/desk/${p}`, { body: {} })).status, 401, p)
  assert.equal((await call('GET', '/api/desk/me')).data.doctor, false)
})

test('DESK: wrong passphrase is refused, and 5 wrong tries lock that device out', async () => {
  const ip = '10.8.8.8'
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/api/desk/login', { body: { passphrase: 'nope' + i }, ip })).status, 401)
  const locked = await call('POST', '/api/desk/login', { body: { passphrase: PASS }, ip }) // even the right one, now
  assert.equal(locked.status, 429)
  assert.equal((await call('POST', '/api/desk/login', { body: { passphrase: PASS }, ip: '10.8.8.9' })).status, 200) // other device unaffected
})

test('DESK: forged or tampered session cookies are rejected', async () => {
  const cookie = await login()
  assert.equal((await call('GET', '/api/desk/list', { cookie })).status, 200)
  const [name, val] = cookie.split('=')
  const parts = val.split('.')
  assert.equal((await call('GET', '/api/desk/list', { cookie: `${name}=${parts[0]}.${parts[1]}.AAAA${parts[2].slice(4)}` })).status, 401)
  assert.equal((await call('GET', '/api/desk/list', { cookie: `${name}=${Date.now() + 9e9}.${parts[1]}.${parts[2]}` })).status, 401)
  assert.equal((await call('GET', '/api/desk/list', { cookie: `${name}=1.1.x` })).status, 401)
})

test('DESK: login cookie is HttpOnly and SameSite=Strict; JSON-only posts', async () => {
  const r = await call('POST', '/api/desk/login', { body: { passphrase: PASS } })
  const sc = r.headers.get('set-cookie')
  assert.match(sc, /HttpOnly/)
  assert.match(sc, /SameSite=Strict/)
  const res = await fetch(BASE + '/api/desk/login', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: PASS })
  assert.equal(res.status, 415)
})

test('DESK: confirm, decline frees the slot, re-confirm fails if someone else took it', async () => {
  const cookie = await login()
  const d = futureDow(6, 13)
  const a = await book(d, 1050, 10)
  const list = await call('GET', `/api/desk/list?from=${d}&to=${d}`, { cookie })
  const id = list.data.bookings[0].id
  assert.ok(list.data.pending.some((p) => p.id === id))
  assert.equal((await call('POST', '/api/desk/update', { cookie, body: { id, status: 'confirmed' } })).data.booking.status, 'confirmed')
  assert.ok(!(await call('GET', `/api/desk/list`, { cookie })).data.pending.some((p) => p.id === id))
  assert.equal((await call('POST', '/api/desk/update', { cookie, body: { id, status: 'declined' } })).data.booking.status, 'declined')
  assert.ok((await slots(d)).includes(1050))
  assert.equal((await book(d, 1050, 11)).status, 201) // a different patient takes it
  const back = await call('POST', '/api/desk/update', { cookie, body: { id, status: 'confirmed' } })
  assert.equal(back.status, 409)
  assert.equal(back.data.error, 'slot_taken')
  assert.equal(a.status, 201)
})

test('DESK: walk-in booking is confirmed straight away and blocks the time', async () => {
  const cookie = await login()
  const d = futureDow(0, 13)
  const r = await call('POST', '/api/desk/create', { cookie, body: { ...person(20), date: d, start: 660 } })
  assert.equal(r.status, 201)
  assert.equal(r.data.booking.status, 'confirmed')
  assert.equal(r.data.booking.source, 'desk')
  assert.ok(!(await slots(d)).includes(660))
  const out = await call('POST', '/api/desk/create', { cookie, body: { ...person(21), date: d, start: 480, force: true } }) // outside hours, doctor's choice
  assert.equal(out.status, 201)
  assert.equal((await call('POST', '/api/desk/create', { cookie, body: { ...person(22), date: d, start: 660, force: true } })).status, 409) // never double-books
})

test('DESK: blocking time removes slots; unblocking restores them', async () => {
  const cookie = await login()
  const d = futureDow(2, 13)
  const before = await slots(d)
  const r = await call('POST', '/api/desk/block', { cookie, body: { date: d, from: 600, to: 840, note: 'Seminar' } })
  assert.equal(r.status, 201)
  assert.deepEqual((await slots(d)).filter((s) => s < 840), [])
  assert.ok((await slots(d)).includes(1050))
  const list = await call('GET', `/api/desk/list?from=${d}&to=${d}`, { cookie })
  assert.equal(list.data.blocks[0].note, 'Seminar')
  await call('POST', '/api/desk/unblock', { cookie, body: { date: d, id: r.data.block.id } })
  assert.deepEqual(await slots(d), before)
  assert.equal((await call('POST', '/api/desk/block', { cookie, body: { date: d, from: 900, to: 800 } })).status, 400)
})

test('DESK: blocking over existing bookings warns about the conflicts', async () => {
  const cookie = await login()
  const d = futureDow(3, 13)
  await book(d, 600, 30)
  const r = await call('POST', '/api/desk/block', { cookie, body: { date: d, from: 600, to: 720 } })
  assert.equal(r.data.conflicts.length, 1)
})

test('DESK: settings change the slot lengths, with sane limits', async () => {
  const cookie = await login()
  const d = futureDow(4, 14)
  assert.equal((await call('POST', '/api/desk/settings', { cookie, body: { durations: { new: 90, follow: 45, counsel: 10 }, horizonDays: 999 } })).status, 200)
  const s = (await call('GET', '/api/desk/settings', { cookie })).data
  assert.equal(s.durations.new, 90)
  assert.equal(s.durations.follow, 30) // 45 is not on the half hour: ignored
  assert.equal(s.durations.counsel, 60) // 10 is too short: ignored
  assert.equal(s.horizonDays, 14) // 999 is out of range: ignored
  assert.deepEqual((await slots(d)).slice(-2), [1080, 1110]) // 90-minute visits: last evening starts are 6:00 and 6:30 pm
  await call('POST', '/api/desk/settings', { cookie, body: { durations: { new: 60 } } })
})

test('DESK: auto-confirm makes new web bookings confirmed', async () => {
  const cookie = await login()
  await call('POST', '/api/desk/settings', { cookie, body: { autoConfirm: true } })
  const r = await book(futureDow(5, 14), 780, 40)
  assert.equal(r.data.status, 'confirmed')
  await call('POST', '/api/desk/settings', { cookie, body: { autoConfirm: false } })
  assert.equal((await book(futureDow(5, 14), 1050, 41)).data.status, 'pending')
})

test('DESK: sign out everywhere kills every existing session', async () => {
  const c1 = await login('10.7.7.1'), c2 = await login('10.7.7.2')
  assert.equal((await call('GET', '/api/desk/list', { cookie: c1 })).status, 200)
  await call('POST', '/api/desk/signout-all', { cookie: c1, body: {} })
  assert.equal((await call('GET', '/api/desk/list', { cookie: c1 })).status, 401)
  assert.equal((await call('GET', '/api/desk/list', { cookie: c2 })).status, 401)
  assert.equal((await call('GET', '/api/desk/list', { cookie: await login('10.7.7.3') })).status, 200) // a fresh sign-in still works
})

test('DESK: Face ID login is offered only after it is set up; registration needs a session', async () => {
  assert.equal((await call('POST', '/api/desk/passkey-auth-options', { body: {} })).status, 404)
  const cookie = await login()
  const opts = await call('POST', '/api/desk/passkey-reg-options', { cookie, body: {} })
  assert.equal(opts.status, 200)
  assert.ok(opts.data.challenge)
  assert.equal(opts.data.authenticatorSelection.userVerification, 'required')
  const bad = await call('POST', '/api/desk/passkey-reg-verify', { cookie, body: { challenge: 'never-issued', response: {} } })
  assert.equal(bad.status, 400)
})

test('push: subscription endpoint stores a subscription for the doctor only', async () => {
  const cookie = await login()
  assert.equal((await call('POST', '/api/desk/push-subscribe', { cookie, body: { subscription: { endpoint: 'https://push.example/x', keys: { p256dh: 'a', auth: 'b' } } } })).status, 200)
  assert.equal((await call('POST', '/api/desk/push-subscribe', { cookie, body: { subscription: {} } })).status, 400)
})
