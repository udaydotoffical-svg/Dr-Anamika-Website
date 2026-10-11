import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { booking, clinic, emergency, hours, links, onlineHours } from '../content.js'
import { clinicNow, fmtRange } from '../lib/time.js'
import { Icon, Reveal, SplitWords, contactHref, prettyPhone } from './ui.jsx'

function nextDays(n = 7) {
  const now = new Date()
  const f = (d, o) => new Intl.DateTimeFormat('en-IN', { timeZone: clinic.timezone, ...o }).format(d)
  const { day } = clinicNow(now)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000)
    return {
      i,
      dow: (day + i) % 7,
      top: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : f(d, { weekday: 'short' }),
      date: f(d, { day: 'numeric' }),
      long: f(d, { weekday: 'long', day: 'numeric', month: 'short' }),
    }
  })
}

// Indian mobile numbers: optional +91 / 0, then ten digits starting 6-9.
export function cleanPhone(raw) {
  const d = String(raw).replace(/[^\d]/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(d) ? d : null
}

function BookingForm() {
  const days = useMemo(() => nextDays(7), [])
  const [type, setType] = useState(booking.types[0].key)
  const [mode, setMode] = useState('clinic')
  const [dayIdx, setDayIdx] = useState(0)
  const [session, setSession] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [trap, setTrap] = useState('') // honeypot: real people never fill this
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle') // idle | sending | sent | failed
  const [copied, setCopied] = useState(false)

  const d = days[dayIdx]
  const nowMin = clinicNow().minutes
  const t = booking.types.find((x) => x.key === type)
  const options =
    mode === 'online'
      ? [{ key: 'online', label: 'Online', range: onlineHours }]
      : hours[d.dow].sessions.map((r, i) => ({ key: i ? 'evening' : 'morning', label: i ? 'Evening' : 'Morning', range: r }))
  const isPast = (o) => dayIdx === 0 && nowMin >= o.range[1] - 30
  const chosen = options.find((o) => o.key === session && !isPast(o)) || options.find((o) => !isPast(o))

  const channel = booking.formEndpoint ? 'form' : clinic.whatsapp ? 'whatsapp' : clinic.phone ? 'call' : 'google'
  const cta = {
    form: 'Request this appointment',
    whatsapp: 'Send on WhatsApp',
    call: 'Copy & call the clinic',
    google: 'Copy & open clinic listing',
  }[channel]

  const summary = {
    type: t.label,
    where: mode === 'online' ? 'Online' : 'In clinic',
    day: d.long,
    time: chosen ? `${chosen.label} (${fmtRange(chosen.range)})` : '',
  }
  const message = [
    `Hello, I would like to book: ${summary.type} (${summary.where}) with ${clinic.doctorFull}.`,
    `Name: ${name.trim()}`,
    phone && `Phone: ${phone.trim()}`,
    `Day: ${summary.day}`,
    chosen && `Time: ${summary.time}`,
    note.trim() && `About: ${note.trim()}`,
  ]
    .filter(Boolean)
    .join('\n')

  const validate = () => {
    const e = {}
    if (name.trim().length < 2) e.name = 'Please enter your name.'
    if (!cleanPhone(phone)) e.phone = 'Enter a 10-digit mobile number so the clinic can confirm your slot.'
    if (!chosen) e.time = 'Pick a time that is still open.'
    flushSync(() => setErrors(e)) // render the errors now so focus can move to the first invalid field
    return Object.keys(e).length === 0
  }

  const reset = () => {
    setState('idle')
    setName('')
    setPhone('')
    setNote('')
    setErrors({})
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (trap) return // a bot filled the hidden field: pretend it worked
    if (!validate()) {
      document.querySelector('.book [aria-invalid="true"]')?.focus()
      return
    }
    if (channel === 'form') {
      setState('sending')
      try {
        const res = await fetch(booking.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...summary, name: name.trim(), phone: cleanPhone(phone), note: note.trim(), message }),
        })
        if (!res.ok) throw new Error(String(res.status))
        setState('sent')
      } catch {
        setState('failed')
      }
      return
    }
    if (channel !== 'whatsapp') {
      // start the copy but don't wait for it: opening the next tab must happen inside the tap,
      // or Safari's popup blocker eats it
      navigator.clipboard?.writeText(message).then(
        () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 6000)
        },
        () => {} // clipboard blocked: the summary is still shown on screen
      )
    }
    const href = contactHref(channel === 'whatsapp' ? 'whatsapp' : 'call', message)
    if (href.startsWith('tel:')) window.location.href = href
    else window.open(href, '_blank', 'noopener')
    setState('sent')
  }

  if (state === 'sent')
    return (
      <div className="book book-done" role="status">
        <motion.div className="done-check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
          <Icon name="check" size={30} />
        </motion.div>
        <h3>{channel === 'form' ? 'Request received' : 'Almost there'}</h3>
        <p>
          {channel === 'form'
            ? `Thank you, ${name.trim().split(' ')[0]}. The clinic will call or message you on ${prettyPhone('91' + cleanPhone(phone))} to confirm your slot.`
            : channel === 'whatsapp'
              ? 'WhatsApp should have opened with your request written out. Press send there and the clinic will confirm your slot.'
              : copied
                ? 'Your request is copied. Paste it when you message, or read it out when you call.'
                : 'Share these details with the clinic to confirm your slot.'}
        </p>
        <dl className="done-sum">
          <div><dt>Visit</dt><dd>{summary.type}</dd></div>
          <div><dt>Where</dt><dd>{summary.where}</dd></div>
          <div><dt>When</dt><dd>{summary.day}, {summary.time}</dd></div>
        </dl>
        <button type="button" className="btn btn-ghost" onClick={reset}>Book another</button>
      </div>
    )

  return (
    <form className="book" onSubmit={submit} noValidate>
      <div className="book-head">
        <h3>Book an appointment</h3>
        <p>Pick a time that suits you. The clinic confirms every slot personally.</p>
      </div>

      {booking.scheduleUrl && (
        <a className="schedule-link" href={booking.scheduleUrl} target="_blank" rel="noreferrer">
          <Icon name="calendar" size={18} />
          <span>
            <b>See live availability</b>
            <small>Open the clinic’s calendar and pick an exact slot</small>
          </span>
          <Icon name="arrow" size={18} />
        </a>
      )}

      <fieldset>
        <legend>Visit</legend>
        <div className="types" role="radiogroup" aria-label="Type of visit">
          {booking.types.map((x) => (
            <button type="button" role="radio" aria-checked={type === x.key} key={x.key} className={`type ${type === x.key ? 'is-on' : ''}`} onClick={() => setType(x.key)}>
              <b>{x.label}</b>
              <small>{x.note}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="seg" role="radiogroup" aria-label="Where">
        {[
          ['clinic', 'In clinic', 'pin'],
          ['online', 'Online', 'video'],
        ].map(([k, l, ic]) => (
          <button type="button" role="radio" aria-checked={mode === k} key={k} className={mode === k ? 'is-on' : ''} onClick={() => setMode(k)}>
            {mode === k && <motion.span layoutId="seg" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <Icon name={ic} size={16} /> {l}
          </button>
        ))}
      </div>

      <fieldset>
        <legend>Day</legend>
        <div className="days">
          {days.map((x) => (
            <button type="button" key={x.i} className={`day ${dayIdx === x.i ? 'is-on' : ''}`} onClick={() => setDayIdx(x.i)} aria-pressed={dayIdx === x.i} aria-label={x.long}>
              <span>{x.top}</span>
              <b>{x.date}</b>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Time</legend>
        <div className="slots">
          {options.map((o) => {
            const past = isPast(o)
            return (
              <button type="button" key={o.key} disabled={past} className={`slot ${chosen?.key === o.key ? 'is-on' : ''}`} aria-pressed={chosen?.key === o.key} onClick={() => setSession(o.key)}>
                <span>{o.label}</span>
                <b>{past ? 'Over for today' : fmtRange(o.range)}</b>
              </button>
            )
          })}
        </div>
        {errors.time && <p className="err" role="alert">{errors.time}</p>}
      </fieldset>

      <div className="fields">
        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Full name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} />
          {errors.name && <em className="err" id="e-name" role="alert">{errors.name}</em>}
        </label>
        <label className="field">
          <span>Mobile number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'e-phone' : undefined} />
          {errors.phone && <em className="err" id="e-phone" role="alert">{errors.phone}</em>}
        </label>
        <label className="field">
          <span>What would you like help with? (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="A line or two is enough. Please don’t share sensitive medical details here." />
        </label>
        <label className="trap" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>

      <button className="btn btn-dark btn-lg btn-block" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : cta} <Icon name="arrow" />
      </button>
      <AnimatePresence>
        {state === 'failed' && (
          <motion.p className="err" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            That didn’t go through. Please try again, or <a href={contactHref('call')} target="_blank" rel="noreferrer">contact the clinic directly</a>.
          </motion.p>
        )}
      </AnimatePresence>
      <p className="book-fine">
        Booking is a request, not a confirmed slot, until the clinic replies. For emergencies call{' '}
        <a href={`tel:${emergency.national}`}>{emergency.national}</a> or <a href={`tel:${emergency.ambulance}`}>{emergency.ambulance}</a>.
      </p>
    </form>
  )
}

export default function Visit() {
  return (
    <section className="visit section" id="visit">
      <div className="wrap">
        <div className="section-head">
          <Reveal as="p" className="eyebrow">
            <span className="eyebrow-dot" /> Visit
          </Reveal>
          <SplitWords className="h2" text="Come and *see us.*" />
        </div>
        <div className="visit-grid">
          <Reveal>
            <BookingForm />
          </Reveal>
          <Reveal className="visit-side" delay={0.1}>
            <div className="map">
              <iframe
                title="Map: Avighna Classical Homeopathy Clinic, Tarsali, Vadodara"
                src={links.embed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="address-card">
              <Icon name="pin" size={22} />
              <address>
                <b>{clinic.name}</b>
                {clinic.addressLines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
              <div className="address-actions">
                <a className="btn btn-dark" href={links.directions} target="_blank" rel="noreferrer">
                  Get directions <Icon name="arrow" />
                </a>
                <a className="btn btn-ghost" href={contactHref('call')} target={clinic.phone ? undefined : '_blank'} rel="noreferrer">
                  <Icon name="phone" size={16} /> {clinic.phone ? prettyPhone(clinic.phone) : 'Call the clinic'}
                </a>
                {clinic.whatsapp && (
                  <a className="btn btn-ghost" href={contactHref('whatsapp')} target="_blank" rel="noreferrer">
                    <Icon name="chat" size={16} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
