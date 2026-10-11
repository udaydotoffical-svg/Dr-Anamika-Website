// Public booking API, used by the website. Nothing here exposes other patients' details.
import { getStore } from '../_lib/store.js'
import { clientIp, deskEnabled, fail, json, limited, query, readBody, sha } from '../_lib/http.js'
import { availability, cancelByRef, createBooking, getSettings, icsFor, publicView, slotsFor } from '../_lib/engine.js'
import { notifyDoctor } from '../_lib/push.js'
import { TYPES, fmtDate, fmtTime, isDate } from '../../shared/schedule.js'

export default async function handler(req, res) {
  try {
    const q = query(req)
    const action = q.action
    const store = getStore()

    if (action === 'config') {
      if (!deskEnabled()) return json(res, 200, { enabled: false })
      const s = await getSettings(store)
      return json(res, 200, { enabled: true, horizonDays: s.horizonDays, autoConfirm: s.autoConfirm, types: TYPES.map((t) => ({ ...t, dur: s.durations[t.key] })) })
    }
    if (!deskEnabled()) return fail(res, 503, 'not_configured', 'Online booking is not switched on yet.')

    if (action === 'availability' && req.method === 'GET') {
      if (!TYPES.some((t) => t.key === q.type)) return fail(res, 400, 'bad_type', 'Unknown visit type.')
      return json(res, 200, { days: await availability(store, { type: q.type, mode: q.mode === 'online' ? 'online' : 'clinic' }) })
    }

    if (action === 'slots' && req.method === 'GET') {
      if (!isDate(q.date) || !TYPES.some((t) => t.key === q.type)) return fail(res, 400, 'bad_request', 'Check the day and visit type.')
      return json(res, 200, { date: q.date, slots: await slotsFor(store, { date: q.date, type: q.type, mode: q.mode === 'online' ? 'online' : 'clinic' }) })
    }

    if (action === 'book' && req.method === 'POST') {
      const body = await readBody(req)
      if (body.trap) return json(res, 200, { ok: true, ref: 'x', status: 'pending' }) // bots get a fake success
      if (await limited(`book:${sha(clientIp(req))}`, 6, 3600)) return fail(res, 429, 'slow_down', 'Too many requests from this device. Please try again later or call the clinic.')
      const r = await createBooking(store, { ...body, start: Number(body.start) }, { source: 'web' })
      if (!r.ok) return fail(res, r.status, r.code, r.message)
      const b = r.booking
      await notifyDoctor({ title: b.status === 'confirmed' ? 'New appointment' : 'New appointment request', body: `${b.name} · ${TYPES.find((t) => t.key === b.type).label} · ${fmtDate(b.date)}, ${fmtTime(b.start)}`, url: '/desk' })
      return json(res, 201, { ok: true, ...publicView(b) })
    }

    if (action === 'status' && req.method === 'GET') {
      const id = q.ref && (await store.get(`ref:${String(q.ref).slice(0, 40)}`))
      const b = id && (await store.get(`b:${id}`))
      return b ? json(res, 200, publicView(b)) : fail(res, 404, 'not_found', 'We could not find that booking.')
    }

    if (action === 'cancel' && req.method === 'POST') {
      if (await limited(`cancel:${sha(clientIp(req))}`, 10, 3600)) return fail(res, 429, 'slow_down', 'Too many requests.')
      const body = await readBody(req)
      const r = await cancelByRef(store, String(body.ref || '').slice(0, 40))
      if (!r.ok) return fail(res, r.status, r.code, r.message)
      await notifyDoctor({ title: 'Appointment cancelled', body: `${r.booking.name} cancelled ${fmtDate(r.booking.date)}, ${fmtTime(r.booking.start)}`, url: '/desk' })
      return json(res, 200, { ok: true, ...publicView(r.booking) })
    }

    if (action === 'ics' && req.method === 'GET') {
      const id = q.ref && (await store.get(`ref:${String(q.ref).slice(0, 40)}`))
      const b = id && (await store.get(`b:${id}`))
      if (!b) return fail(res, 404, 'not_found', 'Not found.')
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="appointment.ics"')
      return res.end(icsFor(b, `Appointment with Dr. Anamika Singh (${TYPES.find((t) => t.key === b.type).label})`, process.env.CLINIC_ADDRESS || 'Avighna Homeopathic Clinic, Tarsali, Vadodara'))
    }

    return fail(res, 404, 'unknown', 'Unknown action.')
  } catch (e) {
    return fail(res, e.status || 500, 'server_error', 'Something went wrong. Please try again.')
  }
}
