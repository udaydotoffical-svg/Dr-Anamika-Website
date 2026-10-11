// Web Push (the "new booking" buzz). Works on Android, desktop, and on iPhone once the page
// has been added to the Home Screen. Everything here is best-effort and never breaks a booking.
import { getStore } from './store.js'

const ready = () => process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY

export const publicKey = () => process.env.VAPID_PUBLIC_KEY || null

export async function notifyDoctor(payload) {
  if (!ready()) return
  try {
    const store = getStore()
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
    const subs = (await store.get('push:subs')) || []
    const keep = []
    for (const s of subs) {
      try {
        await webpush.sendNotification(s, JSON.stringify(payload), { TTL: 3600 })
        keep.push(s)
      } catch (e) {
        if (![404, 410].includes(e.statusCode)) keep.push(s) // keep on temporary errors
      }
    }
    if (keep.length !== subs.length) await store.set('push:subs', keep)
  } catch {
    /* never let a notification failure affect a booking */
  }
}
