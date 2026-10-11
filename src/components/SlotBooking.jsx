// Live booking: real free times from the clinic's calendar. Used when the booking service is
// switched on (see SETUP.md); otherwise the page quietly keeps its simple request form.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { clinic, emergency } from '../content.js'
import { TYPES, addDays, fmtDate, fmtTime, nowParts } from '../../shared/schedule.js'
import { Icon } from './ui.jsx'

const j = async (url, opts) => {
  const res = await fetch(url, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong.'), { code: data.error, status: res.status })
  return data
}
const dayTop = (date, today) => (date === today ? 'Today' : date === addDays(today, 1) ? 'Tmrw' : fmtDate(date, { weekday: 'short' }))
const typeOf = (k) => TYPES.find((t) => t.key === k)

export default function SlotBooking({ cfg }) {
  const today = nowParts().date
  const [type, setType] = useState('new')
  const [mode, setMode] = useState('clinic')
  const [days, setDays] = useState(null)
  const [date, setDate] = useState(null)
  const [slots, setSlots] = useState(null)
  const [start, setStart] = useState(null)
  const [f, setF] = useState({ name: '', phone: '', note: '' })
  const [trap, setTrap] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(null)
  const chosenRef = useRef()
  const dur = cfg.types.find((t) => t.key === type)?.dur ?? 60

  const loadDays = useCallback(async () => {
    setDays(null)
    try {
      const r = await j(`/api/public/availability?type=${type}&mode=${mode}`)
      setDays(r.days)
      setDate((cur) => (cur && r.days.find((d) => d.date === cur && d.free > 0) ? cur : r.days.find((d) => d.free > 0)?.date ?? null))
    } catch { setDays([]) }
  }, [type, mode])
  useEffect(() => { loadDays() }, [loadDays])

  const loadSlots = useCallback(async () => {
    setStart(null)
    if (!date) return setSlots([])
    setSlots(null)
    try { setSlots((await j(`/api/public/slots?date=${date}&type=${type}&mode=${mode}`)).slots) } catch { setSlots([]) }
  }, [date, type, mode])
  useEffect(() => { loadSlots() }, [loadSlots])

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (start === null) er.time = 'Pick a time.'
    if (f.name.trim().length < 2) er.name = 'Please enter your name.'
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/[^\d]/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))) er.phone = 'Enter a 10-digit mobile number so the clinic can reach you.'
    setErrors(er)
    if (Object.keys(er).length) return document.querySelector('.book [aria-invalid="true"]')?.focus()
    setBusy(true); setMsg('')
    try {
      const r = await j('/api/public/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, type, mode, date, start, trap }) })
      setDone(r)
    } catch (x) {
      setMsg(x.message)
      if (x.code === 'slot_taken') { loadSlots(); loadDays() }
    }
    setBusy(false)
  }

  if (done) return <Success r={done} onAgain={() => { setDone(null); setF({ name: '', phone: '', note: '' }); loadDays() }} />

  return (
    <form className="book" onSubmit={submit} noValidate>
      <div className="book-head">
        <h3>Book an appointment</h3>
        <p>{cfg.autoConfirm ? 'Pick a free time and you are booked.' : 'Pick a free time. Dr. Anamika confirms every appointment personally.'}</p>
      </div>

      <fieldset>
        <legend>Visit</legend>
        <div className="types" role="radiogroup" aria-label="Type of visit">
          {cfg.types.map((x) => (
            <button type="button" role="radio" aria-checked={type === x.key} key={x.key} className={`type ${type === x.key ? 'is-on' : ''}`} onClick={() => setType(x.key)}>
              <b>{x.label}</b>
              <small>{x.dur} min · {x.note}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="seg" role="radiogroup" aria-label="Where">
        {[['clinic', 'In clinic', 'pin'], ['online', 'Online', 'video']].map(([k, l, ic]) => (
          <button type="button" role="radio" aria-checked={mode === k} key={k} className={mode === k ? 'is-on' : ''} onClick={() => setMode(k)}>
            {mode === k && <motion.span layoutId="seg" className="seg-bg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <Icon name={ic} size={16} /> {l}
          </button>
        ))}
      </div>

      <fieldset>
        <legend>Day</legend>
        {days === null ? <div className="skel-row" aria-busy="true" /> : (
          <div className="days-scroll" role="group" aria-label="Choose a day">
            {days.map((x) => (
              <button type="button" key={x.date} disabled={x.free === 0} className={`day ${date === x.date ? 'is-on' : ''}`} onClick={() => setDate(x.date)} aria-pressed={date === x.date} aria-label={`${fmtDate(x.date, { weekday: 'long', day: 'numeric', month: 'long' })}${x.free ? '' : ', fully booked'}`}>
                <span>{dayTop(x.date, today)}</span>
                <b>{x.date.slice(8).replace(/^0/, '')}</b>
                <i>{x.free ? `${x.free} free` : 'full'}</i>
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Time</legend>
        {slots === null ? <div className="skel-row" aria-busy="true" /> : slots.length === 0 ? (
          <p className="no-slots">{days && days.every((d) => d.free === 0) ? 'No free times in the next two weeks. Please call the clinic.' : 'No free times that day. Try another day.'}</p>
        ) : (
          <div className="time-grid" role="group" aria-label="Choose a time">
            {slots.map((s) => (
              <button type="button" key={s} className={`tm ${start === s ? 'is-on' : ''}`} aria-pressed={start === s} onClick={() => { setStart(s); setErrors((e) => ({ ...e, time: undefined })) }} ref={start === s ? chosenRef : null}>
                {fmtTime(s)}
              </button>
            ))}
          </div>
        )}
        {start !== null && <p className="picked">{typeOf(type).label} · {fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}, {fmtTime(start)} to {fmtTime(start + dur)}</p>}
        {errors.time && <p className="err" role="alert">{errors.time}</p>}
      </fieldset>

      <div className="fields">
        <label className="field">
          <span>Your name</span>
          <input value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErrors((x) => ({ ...x, name: undefined })) }} autoComplete="name" placeholder="Full name" aria-invalid={!!errors.name} />
          {errors.name && <em className="err" role="alert">{errors.name}</em>}
        </label>
        <label className="field">
          <span>Mobile number</span>
          <input value={f.phone} onChange={(e) => { setF({ ...f, phone: e.target.value }); setErrors((x) => ({ ...x, phone: undefined })) }} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} />
          {errors.phone && <em className="err" role="alert">{errors.phone}</em>}
        </label>
        <label className="field">
          <span>What would you like help with? (optional)</span>
          <textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={2} maxLength={300} placeholder="A line or two is enough. Please don’t share sensitive medical details here." />
        </label>
        <label className="trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>

      <button className="btn btn-dark btn-lg btn-block" type="submit" disabled={busy}>{busy ? 'Booking…' : cfg.autoConfirm ? 'Book this time' : 'Request this time'} <Icon name="arrow" /></button>
      <AnimatePresence>{msg && <motion.p className="err" role="alert" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{msg}</motion.p>}</AnimatePresence>
      <p className="book-fine">
        Your name and number are used only to confirm this appointment. For emergencies call <a href={`tel:${emergency.national}`}>{emergency.national}</a> or <a href={`tel:${emergency.ambulance}`}>{emergency.ambulance}</a>.
      </p>
    </form>
  )
}

function Success({ r, onAgain }) {
  const link = `${location.origin}/my?ref=${r.ref}`
  const confirmed = r.status === 'confirmed'
  return (
    <div className="book book-done" role="status">
      <motion.div className="done-check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}><Icon name="check" size={30} /></motion.div>
      <h3>{confirmed ? 'You are booked' : 'Request sent'}</h3>
      <p>{confirmed ? `See you, ${r.firstName}.` : `Thank you, ${r.firstName}. Dr. Anamika will confirm your time shortly. The clinic will call or message you on the number you gave.`}</p>
      <dl className="done-sum">
        <div><dt>Visit</dt><dd>{typeOf(r.type).label}</dd></div>
        <div><dt>Where</dt><dd>{r.mode === 'online' ? 'Online' : 'In clinic'}</dd></div>
        <div><dt>When</dt><dd>{fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'short' })}, {fmtTime(r.start)}</dd></div>
      </dl>
      <div className="done-actions">
        <a className="btn btn-dark" href={`/my?ref=${r.ref}`}>See or cancel this booking <Icon name="arrow" /></a>
        <a className="btn btn-ghost" href={`/api/public/ics?ref=${r.ref}`}><Icon name="calendar" size={16} /> Add to my calendar</a>
      </div>
      <p className="book-fine">Keep this link to check or cancel later: <a href={link}>{link.replace(/^https?:\/\//, '')}</a></p>
      <button type="button" className="link-btn" onClick={onAgain}>Book another</button>
    </div>
  )
}
