import { clinic, hours } from '../content.js'

// Current weekday (0 = Sunday) and minutes after midnight in the clinic's timezone,
// whatever timezone the visitor is in.
export function clinicNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: clinic.timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  const minutes = Number(get('hour')) * 60 + Number(get('minute'))
  return { day, minutes }
}

export function fmt(min, withSuffix = true) {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  const mm = m ? `:${String(m).padStart(2, '0')}` : ''
  return withSuffix ? `${h}${mm}\u00a0${h24 < 12 ? 'am' : 'pm'}` : `${h}${mm}`
}

// "10 am – 2 pm", "5:30 – 8 pm"
export function fmtRange([a, b]) {
  const sameHalf = a < 720 === b < 720
  return `${sameHalf ? fmt(a, false) : fmt(a)} – ${fmt(b)}`
}

export function status(now = clinicNow()) {
  const { day, minutes } = now
  for (const [a, b] of hours[day].sessions) {
    if (minutes >= a && minutes < b) {
      return {
        open: true,
        soon: b - minutes <= 30,
        label: b - minutes <= 30 ? `Closing soon · ${fmt(b)}` : `Open now · until ${fmt(b)}`,
      }
    }
  }
  // Next opening, searching up to a week ahead.
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7
    const next = hours[d].sessions.find(([a]) => i > 0 || a > minutes)
    if (next) {
      const when = i === 0 ? '' : i === 1 ? 'tomorrow ' : `${hours[d].day} `
      return { open: false, soon: false, label: `Closed · opens ${when}${fmt(next[0])}` }
    }
  }
  return { open: false, soon: false, label: 'Closed' }
}
