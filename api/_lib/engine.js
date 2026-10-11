// Booking rules. Every write that can clash goes through the slot locks, so two patients
// tapping the same time at the same moment cannot both get it.
import { rid } from './http.js'
import { DEFAULT_SETTINGS, GRANULE, TYPES, addDays, cleanPhone, computeSlots, granules, isDate, nowParts } from '../../shared/schedule.js'

const KEEP = 400 * 86400 // booking records are deleted after ~13 months
const LOCK_TTL = 120 * 86400
const MARKS = Array.from({ length: (1320 - 420) / GRANULE }, (_, i) => 420 + i * GRANULE)
const ACTIVE = ['pending', 'confirmed']
const typeKeys = TYPES.map((t) => t.key)

export async function getSettings(store) {
  const s = (await store.get('cfg')) || {}
  return { ...DEFAULT_SETTINGS, ...s, durations: { ...DEFAULT_SETTINGS.durations, ...(s.durations || {}) } }
}

const takenFor = async (store, date) => {
  const vals = await store.mget(MARKS.map((m) => `slot:${date}:${m}`))
  return new Set(MARKS.filter((_, i) => vals[i]))
}
const blocksFor = async (store, date) => (await store.get(`blk:${date}`)) || []

export async function slotsFor(store, { date, type, mode, force = false }, cfg) {
  const s = cfg || (await getSettings(store))
  const [taken, blocks] = await Promise.all([takenFor(store, date), blocksFor(store, date)])
  return computeSlots({ date, mode, dur: s.durations[type], taken, blocks, now: nowParts(), leadMinutes: force ? 0 : s.leadMinutes, force })
}

export async function availability(store, { type, mode }) {
  const s = await getSettings(store)
  const today = nowParts().date
  const days = []
  for (let i = 0; i <= s.horizonDays; i++) {
    const date = addDays(today, i)
    days.push({ date, free: (await slotsFor(store, { date, type, mode }, s)).length })
  }
  return days
}

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n)

export function validate(input, { desk = false } = {}) {
  const type = input.type, mode = input.mode === 'online' ? 'online' : 'clinic'
  const name = clean(input.name, 80), note = clean(input.note, 300), phone = cleanPhone(input.phone)
  if (!typeKeys.includes(type)) return { error: 'bad_type', message: 'Choose a type of visit.' }
  if (!isDate(input.date)) return { error: 'bad_date', message: 'Choose a day.' }
  if (!Number.isInteger(input.start) || input.start % GRANULE) return { error: 'bad_time', message: 'Choose a time.' }
  if (name.length < 2) return { error: 'bad_name', message: 'Please enter your name.' }
  if (!phone) return { error: 'bad_phone', message: 'Enter a 10-digit mobile number so the clinic can reach you.' }
  return { value: { type, mode, date: input.date, start: input.start, name, note, phone, desk } }
}

export async function createBooking(store, input, { source = 'web', force = false } = {}) {
  const v = validate(input, { desk: source === 'desk' })
  if (v.error) return { ok: false, status: 400, code: v.error, message: v.message }
  const b = v.value
  const cfg = await getSettings(store)
  const now = nowParts()
  if (source === 'web' && b.date > addDays(now.date, cfg.horizonDays)) return { ok: false, status: 400, code: 'too_far', message: `Bookings open ${cfg.horizonDays} days ahead.` }
  if (b.date < now.date) return { ok: false, status: 400, code: 'past', message: 'That day has passed.' }

  if (source === 'web') {
    const ids = await store.smembers(`ph:${b.phone}`)
    const recs = (await store.mget(ids.map((i) => `b:${i}`))).filter(Boolean)
    if (recs.filter((r) => ACTIVE.includes(r.status) && r.date >= now.date).length >= cfg.maxActivePerPhone)
      return { ok: false, status: 429, code: 'too_many', message: 'This number already has several upcoming appointments. Please call the clinic to change them.' }
  }

  const free = await slotsFor(store, { date: b.date, type: b.type, mode: b.mode, force }, cfg)
  if (!free.includes(b.start)) return { ok: false, status: 409, code: 'slot_taken', message: 'Sorry, that time was just taken. Please pick another.' }

  const id = rid(9), ref = rid(14), dur = cfg.durations[b.type]
  const got = []
  for (const g of granules(b.start, dur)) {
    if (await store.setnx(`slot:${b.date}:${g}`, id, LOCK_TTL)) got.push(g)
    else {
      await store.del(...got.map((x) => `slot:${b.date}:${x}`))
      return { ok: false, status: 409, code: 'slot_taken', message: 'Sorry, that time was just taken. Please pick another.' }
    }
  }
  const status = source === 'desk' || cfg.autoConfirm ? 'confirmed' : 'pending'
  const rec = { id, ref, ...b, dur, status, source, created: Date.now(), updated: Date.now(), doctorNote: '' }
  await store.set(`b:${id}`, rec, KEEP)
  await store.sadd(`d:${b.date}`, id)
  await store.set(`ref:${ref}`, id, KEEP)
  await store.sadd(`ph:${b.phone}`, id)
  if (status === 'pending') await store.sadd('pend', id)
  return { ok: true, booking: rec }
}

const lockKeys = (b) => granules(b.start, b.dur).map((g) => `slot:${b.date}:${g}`)

export async function updateBooking(store, id, patch) {
  const b = await store.get(`b:${id}`)
  if (!b) return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  const next = { ...b }
  if (typeof patch.doctorNote === 'string') next.doctorNote = clean(patch.doctorNote, 500)
  if (patch.status && patch.status !== b.status) {
    const ok = ['pending', 'confirmed', 'declined', 'cancelled', 'done', 'noshow']
    if (!ok.includes(patch.status)) return { ok: false, status: 400, code: 'bad_status', message: 'Unknown status.' }
    const wasActive = ACTIVE.includes(b.status) || ['done', 'noshow'].includes(b.status)
    const willActive = ACTIVE.includes(patch.status) || ['done', 'noshow'].includes(patch.status)
    if (wasActive && !willActive) await store.del(...lockKeys(b)) // frees the time for someone else
    if (!wasActive && willActive) {
      const got = []
      for (const k of lockKeys(b)) {
        if (await store.setnx(k, id, LOCK_TTL)) got.push(k)
        else { await store.del(...got); return { ok: false, status: 409, code: 'slot_taken', message: 'That time has since been booked by someone else.' } }
      }
    }
    next.status = patch.status
    if (patch.status === 'pending') await store.sadd('pend', id)
    else await store.srem('pend', id)
  }
  next.updated = Date.now()
  await store.set(`b:${id}`, next, KEEP)
  return { ok: true, booking: next }
}

export async function cancelByRef(store, ref) {
  const id = await store.get(`ref:${ref}`)
  const b = id && (await store.get(`b:${id}`))
  if (!b) return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  if (!ACTIVE.includes(b.status)) return { ok: false, status: 409, code: 'not_active', message: 'This appointment can no longer be cancelled here.' }
  const now = nowParts()
  if (b.date < now.date || (b.date === now.date && b.start <= now.minutes)) return { ok: false, status: 409, code: 'started', message: 'This appointment has already started.' }
  const r = await updateBooking(store, id, { status: 'cancelled' })
  if (r.ok) await store.set(`b:${id}`, { ...r.booking, cancelledBy: 'patient' }, KEEP)
  return r.ok ? { ok: true, booking: { ...r.booking, cancelledBy: 'patient' } } : r
}

export async function listRange(store, from, to) {
  const dates = []
  for (let d = from; d <= to && dates.length < 62; d = addDays(d, 1)) dates.push(d)
  const idLists = await Promise.all(dates.map((d) => store.smembers(`d:${d}`)))
  const ids = [...new Set(idLists.flat())]
  const recs = (await store.mget(ids.map((i) => `b:${i}`))).filter(Boolean)
  const blocks = (await store.mget(dates.map((d) => `blk:${d}`))).flatMap((arr, i) => (arr || []).map((k) => ({ ...k, date: dates[i] })))
  return { bookings: recs.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start), blocks }
}

export async function listPending(store) {
  const ids = await store.smembers('pend')
  const recs = (await store.mget(ids.map((i) => `b:${i}`))).filter(Boolean)
  const stale = ids.filter((_, i) => !recs.find((r) => r.id === ids[i]))
  for (const s of stale) await store.srem('pend', s)
  return recs.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
}

export async function addBlock(store, { date, from, to, note }) {
  if (!isDate(date) || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 1440 || to <= from) return { ok: false, status: 400, code: 'bad_block', message: 'Check the date and times.' }
  const list = (await store.get(`blk:${date}`)) || []
  const k = { id: rid(6), from, to, note: clean(note, 80) }
  await store.set(`blk:${date}`, [...list, k], KEEP)
  const ids = await store.smembers(`d:${date}`)
  const recs = (await store.mget(ids.map((i) => `b:${i}`))).filter(Boolean)
  const conflicts = recs.filter((r) => ACTIVE.includes(r.status) && r.start < to && from < r.start + r.dur)
  return { ok: true, block: { ...k, date }, conflicts: conflicts.map((c) => c.id) }
}

export async function removeBlock(store, date, id) {
  const list = (await store.get(`blk:${date}`)) || []
  await store.set(`blk:${date}`, list.filter((k) => k.id !== id), KEEP)
  return { ok: true }
}

export const publicView = (b) => ({ ref: b.ref, status: b.status, type: b.type, mode: b.mode, date: b.date, start: b.start, dur: b.dur, firstName: b.name.split(' ')[0], cancelledBy: b.cancelledBy || null })

const p2 = (n) => String(n).padStart(2, '0')
export function icsFor(b, summary, location) {
  const stamp = (d, m) => `${d.replace(/-/g, '')}T${p2(Math.floor(m / 60))}${p2(m % 60)}00`
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Avighna Clinic//EN', 'BEGIN:VEVENT', `UID:${b.ref}@avighna`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Kolkata:${stamp(b.date, b.start)}`, `DTEND;TZID=Asia/Kolkata:${stamp(b.date, b.start + b.dur)}`, `SUMMARY:${summary}`, `LOCATION:${location}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}
