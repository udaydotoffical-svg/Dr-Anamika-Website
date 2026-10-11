// The doctor's API. Everything except login and "am I signed in" needs her session cookie.
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server'
import { getStore } from '../_lib/store.js'
import { clearSession, clientIp, deskEnabled, fail, isDoctor, json, limited, makeSession, originOf, passphraseOk, query, readBody, sha } from '../_lib/http.js'
import { addBlock, createBooking, getSettings, listPending, listRange, removeBlock, updateBooking } from '../_lib/engine.js'
import { publicKey } from '../_lib/push.js'
import { addDays, nowParts } from '../../shared/schedule.js'

const b64 = (u8) => Buffer.from(u8).toString('base64url')
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64url'))
const rpIdOf = (req) => new URL(originOf(req)).hostname

export default async function handler(req, res) {
  try {
    const q = query(req)
    const action = q.action
    const store = getStore()
    if (!deskEnabled()) return fail(res, 503, 'not_configured', 'The Desk is not set up yet. See SETUP.md.')
    const post = req.method === 'POST'
    if (post && !String(req.headers['content-type'] || '').includes('application/json')) return fail(res, 415, 'json_only', 'JSON only.')
    const body = post ? await readBody(req) : {}
    const ip = sha(clientIp(req))
    const creds = (await store.get('pk:creds')) || []

    // ───── no session needed ─────
    if (action === 'me') {
      const doctor = await isDoctor(req)
      return json(res, 200, { doctor, hasPasskey: creds.length > 0, ...(doctor ? { vapid: publicKey(), passkeys: creds.map((c) => ({ id: c.id, name: c.name, created: c.created })), last: await store.get('auth:last') } : {}) })
    }
    if (action === 'login' && post) {
      if ((await limited(`login:${ip}`, 5, 900)) || (await limited('login:all', 30, 3600))) return fail(res, 429, 'locked', 'Too many tries. Please wait 15 minutes.')
      if (!passphraseOk(body.passphrase)) return fail(res, 401, 'wrong', 'That is not right. Please try again.')
      await makeSession(res, req)
      return json(res, 200, { ok: true })
    }
    if (action === 'logout' && post) { clearSession(res); return json(res, 200, { ok: true }) }

    if (action === 'passkey-auth-options' && post) {
      if (await limited(`pk:${ip}`, 20, 900)) return fail(res, 429, 'locked', 'Too many tries. Please wait.')
      if (!creds.length) return fail(res, 404, 'no_passkey', 'No Face ID login has been set up yet.')
      const opts = await generateAuthenticationOptions({ rpID: rpIdOf(req), allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })), userVerification: 'required' })
      await store.set(`pk:ch:${opts.challenge}`, 1, 300)
      return json(res, 200, opts)
    }
    if (action === 'passkey-auth-verify' && post) {
      if (await limited(`pk:${ip}`, 20, 900)) return fail(res, 429, 'locked', 'Too many tries. Please wait.')
      const challenge = String(body.challenge || '')
      const ok = await store.get(`pk:ch:${challenge}`)
      const cred = creds.find((c) => c.id === body.response?.id)
      if (!ok || !cred) return fail(res, 401, 'wrong', 'Face ID did not match.')
      await store.del(`pk:ch:${challenge}`)
      const v = await verifyAuthenticationResponse({ response: body.response, expectedChallenge: challenge, expectedOrigin: originOf(req), expectedRPID: rpIdOf(req), requireUserVerification: true, credential: { id: cred.id, publicKey: unb64(cred.publicKey), counter: cred.counter, transports: cred.transports } }).catch((e) => { console.error('passkey sign-in rejected:', e.message); return null })
      if (!v?.verified) return fail(res, 401, 'wrong', 'Face ID did not match.')
      cred.counter = v.authenticationInfo.newCounter
      await store.set('pk:creds', creds)
      await makeSession(res, req)
      return json(res, 200, { ok: true })
    }

    // ───── doctor only from here ─────
    if (!(await isDoctor(req))) return fail(res, 401, 'signed_out', 'Please sign in.')

    if (action === 'list') {
      const today = nowParts().date
      const from = /^\d{4}-\d{2}-\d{2}$/.test(q.from || '') ? q.from : today
      const to = /^\d{4}-\d{2}-\d{2}$/.test(q.to || '') ? q.to : addDays(today, 13)
      const [range, pending, settings] = await Promise.all([listRange(store, from, to), listPending(store), getSettings(store)])
      return json(res, 200, { now: nowParts(), from, to, ...range, pending, settings })
    }
    if (action === 'update' && post) {
      const r = await updateBooking(store, String(body.id || ''), { status: body.status, doctorNote: body.doctorNote })
      return r.ok ? json(res, 200, r) : fail(res, r.status, r.code, r.message)
    }
    if (action === 'create' && post) {
      const r = await createBooking(store, { ...body, start: Number(body.start) }, { source: 'desk', force: !!body.force })
      return r.ok ? json(res, 201, r) : fail(res, r.status, r.code, r.message)
    }
    if (action === 'slots') {
      const { slotsFor } = await import('../_lib/engine.js')
      return json(res, 200, { slots: await slotsFor(store, { date: q.date, type: q.type, mode: q.mode === 'online' ? 'online' : 'clinic', force: q.force === '1' }) })
    }
    if (action === 'block' && post) {
      const r = await addBlock(store, { date: body.date, from: Number(body.from), to: Number(body.to), note: body.note })
      return r.ok ? json(res, 201, r) : fail(res, r.status, r.code, r.message)
    }
    if (action === 'unblock' && post) return json(res, 200, await removeBlock(store, String(body.date || ''), String(body.id || '')))

    if (action === 'settings' && !post) return json(res, 200, await getSettings(store))
    if (action === 'settings' && post) {
      const cur = await getSettings(store)
      const dur = (v, d) => (Number.isInteger(v) && v >= 30 && v <= 180 && v % 30 === 0 ? v : d)
      const next = {
        ...cur,
        durations: { new: dur(body.durations?.new, cur.durations.new), follow: dur(body.durations?.follow, cur.durations.follow), counsel: dur(body.durations?.counsel, cur.durations.counsel) },
        horizonDays: Number.isInteger(body.horizonDays) && body.horizonDays >= 1 && body.horizonDays <= 60 ? body.horizonDays : cur.horizonDays,
        leadMinutes: Number.isInteger(body.leadMinutes) && body.leadMinutes >= 0 && body.leadMinutes <= 1440 ? body.leadMinutes : cur.leadMinutes,
        autoConfirm: typeof body.autoConfirm === 'boolean' ? body.autoConfirm : cur.autoConfirm,
      }
      await store.set('cfg', next)
      return json(res, 200, next)
    }

    if (action === 'signout-all' && post) {
      await store.set('auth:v', ((await store.get('auth:v')) || 1) + 1)
      clearSession(res)
      return json(res, 200, { ok: true })
    }

    if (action === 'push-subscribe' && post) {
      const s = body.subscription
      if (!s?.endpoint || !s?.keys) return fail(res, 400, 'bad_sub', 'Bad subscription.')
      const subs = ((await store.get('push:subs')) || []).filter((x) => x.endpoint !== s.endpoint)
      await store.set('push:subs', [...subs, s].slice(-10))
      return json(res, 200, { ok: true })
    }

    if (action === 'passkey-reg-options' && post) {
      const opts = await generateRegistrationOptions({ rpName: 'Avighna Desk', rpID: rpIdOf(req), userName: 'dr-anamika', userDisplayName: 'Dr. Anamika', userID: new TextEncoder().encode('dr-anamika'), attestationType: 'none', excludeCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })), authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' } })
      await store.set(`pk:ch:${opts.challenge}`, 1, 300)
      return json(res, 200, opts)
    }
    if (action === 'passkey-reg-verify' && post) {
      const challenge = String(body.challenge || '')
      if (!(await store.get(`pk:ch:${challenge}`))) return fail(res, 400, 'expired', 'That took too long. Please try again.')
      await store.del(`pk:ch:${challenge}`)
      const v = await verifyRegistrationResponse({ response: body.response, expectedChallenge: challenge, expectedOrigin: originOf(req), expectedRPID: rpIdOf(req), requireUserVerification: true }).catch((e) => { console.error('passkey setup rejected:', e.message); return null })
      if (!v?.verified) return fail(res, 400, 'failed', 'Could not set up Face ID.')
      const c = v.registrationInfo.credential
      const rec = { id: c.id, publicKey: b64(c.publicKey), counter: c.counter, transports: body.response?.response?.transports || c.transports || [], name: String(body.name || 'This phone').slice(0, 40), created: Date.now() }
      await store.set('pk:creds', [...creds.filter((x) => x.id !== rec.id), rec])
      return json(res, 200, { ok: true })
    }
    if (action === 'passkey-remove' && post) {
      await store.set('pk:creds', creds.filter((c) => c.id !== body.id))
      return json(res, 200, { ok: true })
    }

    return fail(res, 404, 'unknown', 'Unknown action.')
  } catch (e) {
    return fail(res, e.status || 500, 'server_error', 'Something went wrong. Please try again.')
  }
}
