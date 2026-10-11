import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { clinic, hours, links, onlineHours } from '../content.js'
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

function BookingForm() {
  const days = useMemo(() => nextDays(7), [])
  const [mode, setMode] = useState('clinic')
  const [dayIdx, setDayIdx] = useState(0)
  const [session, setSession] = useState(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)

  const d = days[dayIdx]
  const nowMin = clinicNow().minutes
  const options =
    mode === 'online'
      ? [{ key: 'online', label: 'Online', range: onlineHours }]
      : hours[d.dow].sessions.map((r, i) => ({ key: i ? 'evening' : 'morning', label: i ? 'Evening' : 'Morning', range: r }))
  const isPast = (o) => dayIdx === 0 && nowMin >= o.range[1] - 30
  const chosen = options.find((o) => o.key === session && !isPast(o)) || options.find((o) => !isPast(o))

  const message = [
    `Hello, I would like to book ${mode === 'online' ? 'an online' : 'an in-clinic'} consultation with ${clinic.doctor}.`,
    name && `Name: ${name}`,
    `Day: ${d.long}`,
    chosen && `Time: ${chosen.label} (${fmtRange(chosen.range)})`,
    note && `About: ${note}`,
  ]
    .filter(Boolean)
    .join('\n')

  const channel = clinic.whatsapp ? 'whatsapp' : clinic.phone ? 'call' : 'google'
  const cta = { whatsapp: 'Send on WhatsApp', call: 'Copy & call the clinic', google: 'Copy & open clinic listing' }[channel]

  const submit = async (e) => {
    e.preventDefault()
    if (channel !== 'whatsapp') {
      try {
        await navigator.clipboard.writeText(message)
        setCopied(true)
        setTimeout(() => setCopied(false), 5000)
      } catch {
        /* clipboard blocked: the visitor can still read the summary on screen */
      }
    }
    const href = contactHref(channel === 'whatsapp' ? 'whatsapp' : 'call', message)
    if (href.startsWith('tel:')) window.location.href = href
    else window.open(href, '_blank', 'noopener')
  }

  return (
    <form className="book" onSubmit={submit}>
      <div className="book-head">
        <h3>Request a consultation</h3>
        <p>Pick a time that suits you. We will confirm your slot.</p>
      </div>

      <div className="seg" role="radiogroup" aria-label="Consultation type">
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
            <button type="button" key={x.i} className={`day ${dayIdx === x.i ? 'is-on' : ''}`} onClick={() => setDayIdx(x.i)} aria-pressed={dayIdx === x.i}>
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
              <button
                type="button"
                key={o.key}
                disabled={past}
                className={`slot ${chosen?.key === o.key ? 'is-on' : ''}`}
                aria-pressed={chosen?.key === o.key}
                onClick={() => setSession(o.key)}
              >
                <span>{o.label}</span>
                <b>{past ? 'Over for today' : fmtRange(o.range)}</b>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="fields">
        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Full name" />
        </label>
        <label className="field">
          <span>What would you like help with? (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="A line or two is enough" />
        </label>
      </div>

      <button className="btn btn-dark btn-lg btn-block" type="submit" disabled={!chosen}>
        {cta} <Icon name="arrow" />
      </button>
      <AnimatePresence>
        {copied && (
          <motion.p className="book-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            Your request is copied. Paste it when you message, or read it out when you call.
          </motion.p>
        )}
      </AnimatePresence>
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
