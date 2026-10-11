import { useCallback, useEffect, useState } from 'react'
import { fmtDate, fmtTime, TYPES } from '../../shared/schedule.js'
import { clinic, links } from '../content.js'
import Logo from './Logo.jsx'
import { Icon, contactHref } from './ui.jsx'

const WORDS = {
  pending: ['Waiting for confirmation', 'Dr. Anamika will confirm this time shortly. The clinic will call or message you.'],
  confirmed: ['Confirmed', 'Your appointment is confirmed. Please arrive 10 minutes early for a first visit.'],
  declined: ['Please choose another time', 'Dr. Anamika is not available at this time. Sorry about that. You can book another time.'],
  cancelled: ['Cancelled', 'This appointment was cancelled.'],
  done: ['Completed', 'Thank you for visiting.'],
  noshow: ['Missed', 'This appointment was marked as missed. You are welcome to book again.'],
}

// The patient's private page for one booking, opened from the link they were given.
export default function MyBooking() {
  const ref = new URLSearchParams(location.search).get('ref') || ''
  const [b, setB] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const load = useCallback(() => fetch(`/api/public/status?ref=${encodeURIComponent(ref)}`).then((r) => (r.ok ? r.json() : null)).then(setB).catch(() => setB(null)), [ref])
  useEffect(() => {
    load()
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 20000)
    return () => clearInterval(id)
  }, [load])
  const cancel = async () => {
    if (!confirm('Cancel this appointment?')) return
    setBusy(true); setErr('')
    const r = await fetch('/api/public/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) setErr(d.message || 'Could not cancel.')
    await load(); setBusy(false)
  }
  const [title, text] = (b && WORDS[b.status]) || []
  return (
    <main className="my">
      <a href="/" className="my-brand"><Logo ring /><span>Avighna<small>Homeopathic Clinic</small></span></a>
      <div className="my-card">
        {b === undefined && <p>Loading…</p>}
        {b === null && <><h1>We could not find that booking</h1><p>Please check the link, or call the clinic.</p></>}
        {b && (
          <>
            <p className="my-kicker">Your appointment</p>
            <h1 className={`my-${b.status}`}>{title}</h1>
            <p className="my-text">{text}</p>
            <dl className="done-sum">
              <div><dt>Name</dt><dd>{b.firstName}</dd></div>
              <div><dt>Visit</dt><dd>{TYPES.find((t) => t.key === b.type)?.label}</dd></div>
              <div><dt>Where</dt><dd>{b.mode === 'online' ? 'Online (the clinic will call you)' : 'In clinic'}</dd></div>
              <div><dt>When</dt><dd>{fmtDate(b.date, { weekday: 'long', day: 'numeric', month: 'long' })}, {fmtTime(b.start)}</dd></div>
            </dl>
            {b.mode === 'clinic' && <p className="my-addr">{clinic.addressLines.join(', ')}</p>}
            <div className="done-actions">
              {['pending', 'confirmed'].includes(b.status) && (<>
                <a className="btn btn-ghost" href={`/api/public/ics?ref=${ref}`}><Icon name="calendar" size={16} /> Add to my calendar</a>
                <a className="btn btn-ghost" href={links.directions} target="_blank" rel="noreferrer"><Icon name="pin" size={16} /> Directions</a>
                <button className="btn btn-ghost danger" onClick={cancel} disabled={busy}>Cancel appointment</button>
              </>)}
              {['declined', 'cancelled', 'noshow'].includes(b.status) && <a className="btn btn-dark" href="/#visit">Book another time <Icon name="arrow" /></a>}
              <a className="btn btn-ghost" href={contactHref('call')} target="_blank" rel="noreferrer"><Icon name="phone" size={16} /> Contact the clinic</a>
            </div>
            {err && <p className="err" role="alert">{err}</p>}
          </>
        )}
      </div>
    </main>
  )
}
