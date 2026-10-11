// Tiny key-value layer with two backends:
//  - Upstash Redis over plain REST (what Vercel's free "Upstash Redis" storage provides)
//  - a JSON file, for local development and tests only
// Everything the app stores goes through these ten functions.
import fs from 'node:fs'
import path from 'node:path'

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

const enc = (v) => JSON.stringify(v)
const dec = (s) => (s == null ? null : JSON.parse(s))

function upstash(base, token) {
  const cmd = async (...args) => {
    const res = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j.error) throw new Error(`store: ${j.error || res.status}`)
    return j.result
  }
  return {
    kind: 'upstash',
    get: async (k) => dec(await cmd('GET', k)),
    set: async (k, v, ex) => void (ex ? await cmd('SET', k, enc(v), 'EX', ex) : await cmd('SET', k, enc(v))),
    setnx: async (k, v, ex) => (ex ? await cmd('SET', k, enc(v), 'EX', ex, 'NX') : await cmd('SET', k, enc(v), 'NX')) === 'OK',
    del: async (...ks) => (ks.length ? void (await cmd('DEL', ...ks)) : undefined),
    mget: async (ks) => (ks.length ? (await cmd('MGET', ...ks)).map(dec) : []),
    sadd: async (k, m) => void (await cmd('SADD', k, m)),
    srem: async (k, m) => void (await cmd('SREM', k, m)),
    smembers: async (k) => (await cmd('SMEMBERS', k)) || [],
    incr: async (k, ex) => {
      const n = await cmd('INCR', k)
      if (n === 1 && ex) await cmd('EXPIRE', k, ex)
      return n
    },
  }
}

function fileStore(file) {
  let db = {}
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { db = {} }
  const save = () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(db)) }
  const live = (k) => {
    const e = db[k]
    if (!e) return undefined
    if (e.x && e.x < Date.now()) { delete db[k]; return undefined }
    return e
  }
  const setRaw = (k, v, ex) => { db[k] = { v, x: ex ? Date.now() + ex * 1000 : 0 }; save() }
  return {
    kind: 'file',
    get: async (k) => live(k)?.v ?? null,
    set: async (k, v, ex) => setRaw(k, v, ex),
    setnx: async (k, v, ex) => { if (live(k)) return false; setRaw(k, v, ex); return true },
    del: async (...ks) => { ks.forEach((k) => delete db[k]); save() },
    mget: async (ks) => ks.map((k) => live(k)?.v ?? null),
    sadd: async (k, m) => { const s = new Set(live(k)?.v || []); s.add(m); setRaw(k, [...s]) },
    srem: async (k, m) => { const s = new Set(live(k)?.v || []); s.delete(m); setRaw(k, [...s]) },
    smembers: async (k) => live(k)?.v || [],
    incr: async (k, ex) => { const e = live(k); const n = (e?.v || 0) + 1; db[k] = { v: n, x: e?.x || (ex ? Date.now() + ex * 1000 : 0) }; save(); return n },
  }
}

let cached
export function getStore() {
  if (cached !== undefined) return cached
  if (URL_ && TOKEN) cached = upstash(URL_, TOKEN)
  else if (process.env.DESK_DEV_STORE) cached = fileStore(process.env.DESK_DEV_STORE)
  else cached = null // not set up: the website quietly falls back to its simple booking form
  return cached
}
export const resetStoreForTests = () => { cached = undefined }
