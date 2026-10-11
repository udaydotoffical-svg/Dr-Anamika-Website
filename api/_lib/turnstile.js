// Cloudflare Turnstile: a free "are you a robot?" check that is invisible to almost every real person.
// Off until both keys are set, so nothing changes until the clinic turns it on. When it is on,
// a booking without a valid check is refused (the check fails closed, never open).
export const turnstileOn = () => !!process.env.TURNSTILE_SECRET_KEY && !!process.env.TURNSTILE_SITE_KEY

export async function verifyTurnstile(token, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return { ok: false, code: 'bot_check' }
  try {
    const res = await fetch(process.env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    })
    const j = await res.json()
    return j.success === true ? { ok: true } : { ok: false, code: 'bot_check' }
  } catch {
    return { ok: false, code: 'bot_unreachable' }
  }
}
