import crypto from 'node:crypto'
import { getStore } from './store.js'

export const deskEnabled = () => !!getStore() && (process.env.DESK_PASSPHRASE || '').length >= 8

export const json = (res, status, body, headers = {}) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(JSON.stringify(body))
}
export const fail = (res, status, error, message) => json(res, status, { error, message })

export async function readBody(req) {
  if (req.body !== undefined && req.body !== null) return typeof req.body === 'string' ? safeParse(req.body) : req.body
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > 20_000) throw Object.assign(new Error('too big'), { status: 413 })
    chunks.push(c)
  }
  return safeParse(Buffer.concat(chunks).toString('utf8'))
}
const safeParse = (s) => { try { return s ? JSON.parse(s) : {} } catch { return {} } }

export function query(req) {
  if (req.query && Object.keys(req.query).length) return req.query
  return Object.fromEntries(new URL(req.url, 'http://x').searchParams)
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
export const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
export const rid = (n = 12) => crypto.randomBytes(n).toString('base64url')

// Count hits per window. Returns true when the caller is over the limit.
export async function limited(key, max, seconds) {
  const store = getStore()
  const n = await store.incr(`rl:${key}`, seconds)
  return n > max
}

// ───────── desk session: signed cookie + a server-side version so "sign out everywhere" works ─────────
const secret = () => process.env.DESK_SECRET || sha('avighna-desk:' + (process.env.DESK_PASSPHRASE || ''))
const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('base64url')
const DAYS = 30

export async function makeSession(res, req) {
  const store = getStore()
  const v = (await store.get('auth:v')) || 1
  const exp = Date.now() + DAYS * 864e5
  const body = `${exp}.${v}`
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', `desk=${body}.${sign(body)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DAYS * 86400}${secure}`)
  await store.set('auth:last', { at: Date.now(), ua: String(req.headers['user-agent'] || '').slice(0, 120) })
}
export const clearSession = (res) => res.setHeader('Set-Cookie', 'desk=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')

export async function isDoctor(req) {
  const m = /(?:^|;\s*)desk=([^;]+)/.exec(req.headers.cookie || '')
  if (!m) return false
  const [exp, v, sig] = m[1].split('.')
  if (!sig) return false
  const body = `${exp}.${v}`
  const a = Buffer.from(sign(body)), b = Buffer.from(sig)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  if (Number(exp) < Date.now()) return false
  return Number(v) === ((await getStore().get('auth:v')) || 1)
}

export function passphraseOk(given) {
  const want = process.env.DESK_PASSPHRASE
  if (!want || !given) return false
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(String(given)).digest(), crypto.createHash('sha256').update(want).digest())
}

export const originOf = (req) => {
  if (process.env.DESK_ORIGIN) return process.env.DESK_ORIGIN
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const proto = req.headers['x-forwarded-proto'] || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
