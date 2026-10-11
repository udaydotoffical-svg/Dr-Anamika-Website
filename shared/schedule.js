// One source of truth for the clinic's hours and the slot rules.
// Pure functions only, so the website, the API and the Desk app all agree.

export const TZ = 'Asia/Kolkata'

// Minutes after midnight. Index 0 = Sunday.
const MON_SAT = [[600, 840], [1050, 1200]] // 10:00–14:00, 17:30–20:00
export const WEEK = [
  [[600, 840], [1050, 1230]], // Sunday: evening until 20:30
  MON_SAT, MON_SAT, MON_SAT, MON_SAT, MON_SAT, MON_SAT,
]
export const ONLINE = [540, 780] // 9:00–13:00, every day
export const GRANULE = 30 // slots start on the half hour

export const TYPES = [
  { key: 'new', label: 'First consultation', note: 'Longer visit, about an hour' },
  { key: 'follow', label: 'Follow-up', note: 'Review of your remedy' },
  { key: 'counsel', label: 'Counselling & therapy', note: 'A session to talk things through' },
]

export const DEFAULT_SETTINGS = {
  durations: { new: 60, follow: 30, counsel: 60 }, // minutes
  horizonDays: 14, // how far ahead patients can book
  leadMinutes: 60, // no bookings starting sooner than this
  autoConfirm: false, // false = the doctor confirms every request herself
  maxActivePerPhone: 3,
}

const pad = (n) => String(n).padStart(2, '0')

// 'YYYY-MM-DD' and minutes-after-midnight in clinic time, whatever the server's timezone.
export function nowParts(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  )
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
export const dowOf = (date) => new Date(date + 'T00:00:00Z').getUTCDay()
export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export const windowsFor = (date, mode) => (mode === 'online' ? [ONLINE] : WEEK[dowOf(date)])

// The half-hour marks a booking occupies: start 600, dur 60 -> [600, 630].
export function granules(start, dur) {
  const out = []
  for (let m = start; m < start + dur; m += GRANULE) out.push(m)
  return out
}

const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1

// Free start times for one day.
//  taken   Set of half-hour marks already booked
//  blocks  [{from, to}] time the doctor has blocked off
//  force   desk bookings may ignore opening hours (never ignores existing bookings)
export function computeSlots({ date, mode, dur, taken = new Set(), blocks = [], now, leadMinutes = 0, force = false }) {
  if (date < now.date) return []
  const wins = force ? [[420, 1320]] : windowsFor(date, mode)
  const out = []
  for (const [a, b] of wins) {
    for (let s = a; s + dur <= b; s += GRANULE) {
      if (date === now.date && s < now.minutes + leadMinutes) continue
      if (granules(s, dur).some((g) => taken.has(g))) continue
      if (!force && blocks.some((k) => overlaps(s, s + dur, k.from, k.to))) continue
      out.push(s)
    }
  }
  return out
}

export function fmtTime(min) {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}${m ? ':' + pad(m) : ''} ${h24 < 12 ? 'am' : 'pm'}`
}

export function fmtDate(date, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...opts }).format(new Date(date + 'T00:00:00Z'))
}

// Indian mobile: optional +91 / 0, then ten digits starting 6-9. Returns the ten digits or null.
export function cleanPhone(raw) {
  const d = String(raw ?? '').replace(/[^\d]/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(d) ? d : null
}
