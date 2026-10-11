// A tiny fake of the Upstash Redis REST API (just the commands the app uses),
// so the production storage code path can be tested without an account.
import http from 'node:http'

export function startMockUpstash(token = 'test-token') {
  const kv = new Map() // key -> { v, exp }
  const live = (k) => {
    const e = kv.get(k)
    if (!e) return undefined
    if (e.exp && e.exp < Date.now()) { kv.delete(k); return undefined }
    return e
  }
  const run = ([cmd, ...a]) => {
    switch (String(cmd).toUpperCase()) {
      case 'GET': return live(a[0])?.v ?? null
      case 'SET': {
        let ex = 0, nx = false
        for (let i = 2; i < a.length; i++) { if (String(a[i]).toUpperCase() === 'EX') ex = Number(a[++i]); else if (String(a[i]).toUpperCase() === 'NX') nx = true }
        if (nx && live(a[0])) return null
        kv.set(a[0], { v: String(a[1]), exp: ex ? Date.now() + ex * 1000 : 0 })
        return 'OK'
      }
      case 'DEL': { let n = 0; for (const k of a) if (kv.delete(k)) n++; return n }
      case 'MGET': return a.map((k) => live(k)?.v ?? null)
      case 'SADD': { const e = live(a[0]) || { v: new Set(), exp: 0 }; const had = e.v.has(a[1]); e.v.add(a[1]); kv.set(a[0], e); return had ? 0 : 1 }
      case 'SREM': { const e = live(a[0]); return e && e.v.delete(a[1]) ? 1 : 0 }
      case 'SMEMBERS': return [...(live(a[0])?.v || [])]
      case 'INCR': { const e = live(a[0]); const n = Number(e?.v || 0) + 1; kv.set(a[0], { v: String(n), exp: e?.exp || 0 }); return n }
      case 'EXPIRE': { const e = live(a[0]); if (e) e.exp = Date.now() + Number(a[1]) * 1000; return e ? 1 : 0 }
      default: throw new Error('unsupported ' + cmd)
    }
  }
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      if (req.headers.authorization !== `Bearer ${token}`) { res.statusCode = 401; return res.end('{"error":"unauthorized"}') }
      try { res.end(JSON.stringify({ result: run(JSON.parse(body)) })) } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: e.message })) }
    })
  })
  return new Promise((resolve) => server.listen(0, () => resolve({ url: `http://localhost:${server.address().port}`, token, close: () => server.close() })))
}
