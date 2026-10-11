// Local stand-in for Vercel's /api routing, so the real handlers can be run and tested.
//   DESK_PASSPHRASE=... DESK_DEV_STORE=.data/dev.json node dev-server.mjs
import http from 'node:http'

const PORT = Number(process.env.API_PORT || 8787)
const routes = {
  public: () => import('./api/public/[action].js'),
  desk: () => import('./api/desk/[action].js'),
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x')
    const m = /^\/api\/(public|desk)\/([\w-]+)$/.exec(u.pathname)
    if (!m) { res.statusCode = 404; return res.end('not found') }
    req.query = { ...Object.fromEntries(u.searchParams), action: m[2] }
    const mod = await routes[m[1]]()
    await mod.default(req, res)
  })
  .listen(PORT, () => console.log(`api on http://localhost:${PORT}`))
