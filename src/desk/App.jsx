import { useCallback, useEffect, useRef, useState } from 'react'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { api } from './api.js'
import Logo from '../components/Logo.jsx'
import { TYPES, addDays, fmtDate, fmtTime } from '../../shared/schedule.js'

const ADDRESS = 'A111, Lane No. 01, Anand Baug Society, Susen–Tarsali Link Road, Tarsali, Vadodara'
const typeLabel = (k) => TYPES.find((t) => t.key === k)?.label || k
const first = (n) => String(n).split(' ')[0]
const dayLabel = (date, today) => (date === today ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' }))
const tel = (p) => `tel:+91${p}`
const wa = (p, t) => `https://wa.me/91${p}?text=${encodeURIComponent(t)}`
const sms = (p, t) => `sms:+91${p}&body=${encodeURIComponent(t)}`
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const standalone = () => window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches
const STATUS = { pending: 'Needs reply', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled', done: 'Done', noshow: 'No-show' }

function messageFor(kind, b) {
  const when = `${fmtDate(b.date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${fmtTime(b.start)}`
  if (kind === 'confirmed')
    return `Hello ${first(b.name)}, your ${typeLabel(b.type)} (${b.mode === 'online' ? 'online' : 'in clinic'}) with Dr. Anamika Singh at Avighna Homeopathic Clinic is confirmed for ${when}.${b.mode === 'online' ? ' We will call you at that time.' : ' Address: ' + ADDRESS + '.'} Please let us know if you need to change it.`
  if (kind === 'declined') return `Hello ${first(b.name)}, sorry, Dr. Anamika is not available on ${when}. Please choose another time at ${location.origin} or call the clinic.`
  return `Hello ${first(b.name)}, we are sorry, but your appointment on ${when} has been cancelled. Please book another time at ${location.origin} or call the clinic.`
}

/* ─────────────── tiny UI pieces ─────────────── */
const Sheet = ({ title, onClose, children }) => (
  <div className="dk-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
    <button className="dk-scrim" aria-label="Close" onClick={onClose} />
    <div className="dk-sheet">
      <div className="dk-grab" />
      <div className="dk-sheet-head">
        <h2>{title}</h2>
        <button className="dk-x" onClick={onClose} aria-label="Close">✕</button>
      </div>
      {children}
    </div>
  </div>
)
const Badge = ({ s }) => <span className={`dk-badge s-${s}`}>{STATUS[s]}</span>

function Row({ b, onOpen, today }) {
  return (
    <button className={`dk-row s-${b.status}`} onClick={() => onOpen(b)}>
      <span className="dk-time">
        <b>{fmtTime(b.start)}</b>
        <small>{b.dur} min</small>
      </span>
      <span className="dk-who">
        <b>{b.name}</b>
        <small>
          {typeLabel(b.type)} · {b.mode === 'online' ? 'Online' : 'In clinic'}
          {b.date !== today ? ` · ${fmtDate(b.date)}` : ''}
        </small>
      </span>
      <Badge s={b.status} />
    </button>
  )
}

/* ─────────────── sign in ─────────────── */
function Login({ me, onDone }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await api('login', { method: 'POST', body: { passphrase: pass } }); onDone() } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  const faceId = async () => {
    setBusy(true); setErr('')
    try {
      const opts = await api('passkey-auth-options', { method: 'POST' })
      const response = await startAuthentication({ optionsJSON: opts })
      await api('passkey-auth-verify', { method: 'POST', body: { challenge: opts.challenge, response } })
      onDone()
    } catch (x) { setErr(x.name === 'NotAllowedError' ? 'Face ID was cancelled.' : x.message) }
    setBusy(false)
  }
  return (
    <main className="dk-login">
      <Logo ring className="dk-login-logo" />
      <h1>Avighna Desk</h1>
      <p>Appointments for Dr. Anamika Singh</p>
      {me.hasPasskey && (
        <button className="dk-btn dk-primary dk-big" onClick={faceId} disabled={busy}>Unlock with Face ID</button>
      )}
      <form onSubmit={submit}>
        <label>
          <span>{me.hasPasskey ? 'Or use your passphrase' : 'Passphrase'}</span>
          <input type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Type your passphrase" />
        </label>
        {err && <p className="dk-err" role="alert">{err}</p>}
        <button className={`dk-btn dk-big ${me.hasPasskey ? '' : 'dk-primary'}`} disabled={busy || pass.length < 4}>{busy ? 'Please wait…' : 'Sign in'}</button>
      </form>
    </main>
  )
}

/* ─────────────── booking details ─────────────── */
function BookingSheet({ b, today, onClose, onChange, tell }) {
  const [note, setNote] = useState(b.doctorNote || '')
  const [busy, setBusy] = useState(false)
  const set = async (status, then) => {
    setBusy(true)
    try { const r = await api('update', { method: 'POST', body: { id: b.id, status } }); await onChange(); if (then) tell(then, r.booking); else onClose() } catch (e) { alert(e.message) }
    setBusy(false)
  }
  const saveNote = async () => { if (note !== (b.doctorNote || '')) { await api('update', { method: 'POST', body: { id: b.id, doctorNote: note } }); onChange() } }
  const msg = messageFor(b.status === 'declined' ? 'declined' : b.status === 'cancelled' ? 'cancelled' : 'confirmed', b)
  return (
    <Sheet title={b.name} onClose={onClose}>
      <p className="dk-sub">{dayLabel(b.date, today)}, {fmtTime(b.start)} · {b.dur} min · {typeLabel(b.type)} · {b.mode === 'online' ? 'Online' : 'In clinic'}</p>
      <Badge s={b.status} />
      {b.note && <p className="dk-quote">“{b.note}”</p>}
      {b.cancelledBy === 'patient' && <p className="dk-sub">The patient cancelled this themselves.</p>}
      <div className="dk-contact">
        <a className="dk-btn" href={tel(b.phone)}>Call</a>
        <a className="dk-btn" href={wa(b.phone, msg)} target="_blank" rel="noreferrer">WhatsApp</a>
        <a className="dk-btn" href={sms(b.phone, msg)}>Message</a>
      </div>
      <p className="dk-phone">+91 {b.phone.slice(0, 5)} {b.phone.slice(5)}</p>
      <div className="dk-actions">
        {b.status === 'pending' && (<><button className="dk-btn dk-primary dk-big" disabled={busy} onClick={() => set('confirmed', 'confirmed')}>Confirm</button><button className="dk-btn dk-big" disabled={busy} onClick={() => set('declined', 'declined')}>Decline</button></>)}
        {b.status === 'confirmed' && (<><button className="dk-btn dk-primary dk-big" disabled={busy} onClick={() => set('done')}>Mark as done</button><button className="dk-btn" disabled={busy} onClick={() => set('noshow')}>Did not come</button><button className="dk-btn dk-danger" disabled={busy} onClick={() => confirm('Cancel this appointment? The time becomes free for others.') && set('cancelled', 'cancelled')}>Cancel appointment</button></>)}
        {['declined', 'cancelled', 'done', 'noshow'].includes(b.status) && <button className="dk-btn" disabled={busy} onClick={() => set('confirmed')}>Put back as confirmed</button>}
      </div>
      <label className="dk-field">
        <span>Your private note</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} placeholder="Only you can see this" />
      </label>
    </Sheet>
  )
}

function TellSheet({ kind, b, onClose }) {
  const [text, setText] = useState(messageFor(kind, b))
  const title = kind === 'confirmed' ? 'Confirmed ✓ Tell the patient?' : kind === 'declined' ? 'Declined. Tell the patient?' : 'Cancelled. Tell the patient?'
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="dk-sub">One tap opens your own WhatsApp or Messages with this ready to send to {first(b.name)} only.</p>
      <textarea className="dk-tell" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="dk-actions">
        <a className="dk-btn dk-primary dk-big" href={wa(b.phone, text)} target="_blank" rel="noreferrer" onClick={onClose}>Send on WhatsApp</a>
        <a className="dk-btn dk-big" href={sms(b.phone, text)} onClick={onClose}>Send as message</a>
        <button className="dk-btn" onClick={onClose}>Skip, I will call</button>
      </div>
    </Sheet>
  )
}

/* ─────────────── add a booking (walk-in / phone call) ─────────────── */
function AddSheet({ today, onClose, onChange, start }) {
  const [f, setF] = useState({ name: '', phone: '', note: '', type: 'new', mode: 'clinic', date: start || today, force: false })
  const [slots, setSlots] = useState([])
  const [pick, setPick] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const upd = (k, v) => setF((x) => ({ ...x, [k]: v }))
  useEffect(() => {
    setPick(null)
    api(`slots?date=${f.date}&type=${f.type}&mode=${f.mode}&force=${f.force ? 1 : 0}`).then((r) => setSlots(r.slots)).catch(() => setSlots([]))
  }, [f.date, f.type, f.mode, f.force])
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await api('create', { method: 'POST', body: { ...f, start: pick } }); await onChange(); onClose() } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <Sheet title="Add an appointment" onClose={onClose}>
      <form className="dk-form" onSubmit={submit}>
        <label className="dk-field"><span>Name</span><input value={f.name} onChange={(e) => upd('name', e.target.value)} autoComplete="off" /></label>
        <label className="dk-field"><span>Mobile number</span><input type="tel" inputMode="tel" value={f.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="98765 43210" /></label>
        <label className="dk-field"><span>Visit</span><select value={f.type} onChange={(e) => upd('type', e.target.value)}>{TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
        <div className="dk-seg">{['clinic', 'online'].map((m) => <button type="button" key={m} className={f.mode === m ? 'on' : ''} onClick={() => upd('mode', m)}>{m === 'clinic' ? 'In clinic' : 'Online'}</button>)}</div>
        <label className="dk-field"><span>Day</span><input type="date" min={today} value={f.date} onChange={(e) => upd('date', e.target.value)} /></label>
        <label className="dk-check"><input type="checkbox" checked={f.force} onChange={(e) => upd('force', e.target.checked)} /> Allow times outside clinic hours</label>
        <div className="dk-slots">
          {slots.length === 0 && <p className="dk-sub">No free times that day.</p>}
          {slots.map((s) => <button type="button" key={s} className={pick === s ? 'on' : ''} onClick={() => setPick(s)}>{fmtTime(s)}</button>)}
        </div>
        {err && <p className="dk-err" role="alert">{err}</p>}
        <button className="dk-btn dk-primary dk-big" disabled={busy || pick === null || f.name.trim().length < 2 || f.phone.replace(/\D/g, '').length < 10}>Add to calendar</button>
      </form>
    </Sheet>
  )
}

/* ─────────────── time off ─────────────── */
function TimeOffSheet({ today, blocks, onClose, onChange }) {
  const [date, setDate] = useState(today)
  const [whole, setWhole] = useState(true)
  const [from, setFrom] = useState('10:00')
  const [to, setTo] = useState('14:00')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const add = async (e) => {
    e.preventDefault(); setMsg('')
    try {
      const r = await api('block', { method: 'POST', body: { date, from: whole ? 0 : toMin(from), to: whole ? 1440 : toMin(to), note } })
      await onChange()
      setMsg(r.conflicts.length ? `Blocked. ${r.conflicts.length} existing appointment${r.conflicts.length > 1 ? 's' : ''} in that time still ${r.conflicts.length > 1 ? 'need' : 'needs'} your attention.` : 'Blocked. Patients cannot book that time.')
    } catch (x) { setMsg(x.message) }
  }
  const remove = async (k) => { await api('unblock', { method: 'POST', body: { date: k.date, id: k.id } }); onChange() }
  return (
    <Sheet title="Time off" onClose={onClose}>
      <form className="dk-form" onSubmit={add}>
        <label className="dk-field"><span>Day</span><input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="dk-check"><input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} /> Whole day</label>
        {!whole && <div className="dk-two"><label className="dk-field"><span>From</span><input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="dk-field"><span>Until</span><input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>}
        <label className="dk-field"><span>Reason (only you see it)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Holiday, seminar…" /></label>
        <button className="dk-btn dk-primary dk-big">Block this time</button>
        {msg && <p className="dk-sub" role="status">{msg}</p>}
      </form>
      {blocks.length > 0 && <h3 className="dk-h3">Coming up</h3>}
      {blocks.map((k) => (
        <div className="dk-block" key={k.id}>
          <span><b>{fmtDate(k.date)}</b> · {k.from === 0 && k.to === 1440 ? 'Whole day' : `${fmtTime(k.from)} – ${fmtTime(k.to)}`}{k.note ? ` · ${k.note}` : ''}</span>
          <button className="dk-link" onClick={() => remove(k)}>Remove</button>
        </div>
      ))}
    </Sheet>
  )
}

/* ─────────────── more: settings, alerts, Face ID, account ─────────────── */
function More({ me, settings, reload, refreshMe, signOut, toast }) {
  const [s, setS] = useState(settings)
  const save = async (patch) => { const next = { ...s, ...patch }; setS(next); try { setS(await api('settings', { method: 'POST', body: patch })) ; toast('Saved') } catch (e) { toast(e.message) } }
  const pushOk = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [alerts, setAlerts] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const enableAlerts = async () => {
    try {
      if (!me.vapid) return toast('Alerts are not switched on for this site yet.')
      const reg = await navigator.serviceWorker.register('/desk/sw.js', { scope: '/desk/' })
      const perm = await Notification.requestPermission(); setAlerts(perm)
      if (perm !== 'granted') return toast('Alerts are off. You can allow them in Settings.')
      const key = Uint8Array.from(atob(me.vapid.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }))
      await api('push-subscribe', { method: 'POST', body: { subscription: sub.toJSON() } })
      toast('Alerts are on ✓')
    } catch (e) { toast('Could not turn on alerts: ' + e.message) }
  }
  const addFaceId = async () => {
    try {
      const opts = await api('passkey-reg-options', { method: 'POST' })
      const response = await startRegistration({ optionsJSON: opts })
      await api('passkey-reg-verify', { method: 'POST', body: { challenge: opts.challenge, response, name: /iPhone/.test(navigator.userAgent) ? 'iPhone' : 'This phone' } })
      await refreshMe(); toast('Face ID is set up ✓')
    } catch (e) { toast(e.name === 'NotAllowedError' ? 'Cancelled.' : 'Could not set up Face ID: ' + (e.message || e)) }
  }
  const removeKey = async (id) => { if (confirm('Remove Face ID login for this device?')) { await api('passkey-remove', { method: 'POST', body: { id } }); refreshMe() } }
  const signOutAll = async () => { if (confirm('Sign out on every phone and computer? You will need your passphrase again.')) { await api('signout-all', { method: 'POST' }); signOut() } }
  return (
    <div className="dk-more">
      {!standalone() && (
        <section className="dk-card dk-install">
          <h3>Put this on your iPhone</h3>
          <ol><li>Tap the <b>Share</b> button (square with an arrow) at the bottom of Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open <b>Avighna Desk</b> from your home screen.</li></ol>
        </section>
      )}
      <section className="dk-card">
        <h3>How bookings work</h3>
        <label className="dk-switch"><span><b>Confirm automatically</b><small>{s.autoConfirm ? 'New requests are confirmed straight away.' : 'You confirm each request yourself (recommended).'}</small></span><input type="checkbox" checked={s.autoConfirm} onChange={(e) => save({ autoConfirm: e.target.checked })} /></label>
        {TYPES.map((t) => (
          <label className="dk-field dk-inline" key={t.key}><span>{t.label} lasts</span><select value={s.durations[t.key]} onChange={(e) => save({ durations: { [t.key]: Number(e.target.value) } })}>{[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
        ))}
        <label className="dk-field dk-inline"><span>Patients can book up to</span><select value={s.horizonDays} onChange={(e) => save({ horizonDays: Number(e.target.value) })}>{[7, 14, 30].map((d) => <option key={d} value={d}>{d} days ahead</option>)}</select></label>
        <label className="dk-field dk-inline"><span>Not sooner than</span><select value={s.leadMinutes} onChange={(e) => save({ leadMinutes: Number(e.target.value) })}>{[[0, 'no limit'], [60, '1 hour ahead'], [180, '3 hours ahead'], [720, '12 hours ahead']].map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select></label>
      </section>
      <section className="dk-card">
        <h3>New-booking alerts</h3>
        {!pushOk ? <p className="dk-sub">Alerts need this page to be added to your Home Screen first (see above).</p> : alerts === 'granted' ? <p className="dk-sub">Alerts are on for this phone.</p> : <button className="dk-btn dk-primary" onClick={enableAlerts}>Turn on alerts</button>}
      </section>
      <section className="dk-card">
        <h3>Face ID</h3>
        <p className="dk-sub">Unlock the Desk with your face instead of typing. Only your phone's Face ID can open it.</p>
        {(me.passkeys || []).map((k) => <div className="dk-block" key={k.id}><span>{k.name}</span><button className="dk-link" onClick={() => removeKey(k.id)}>Remove</button></div>)}
        <button className="dk-btn" onClick={addFaceId}>{(me.passkeys || []).length ? 'Add Face ID on another device' : 'Set up Face ID'}</button>
      </section>
      <section className="dk-card">
        <h3>Security</h3>
        {me.last && <p className="dk-sub">Last sign-in: {new Date(me.last.at).toLocaleString('en-IN')}</p>}
        <button className="dk-btn" onClick={signOutAll}>Sign out on all devices</button>
        <button className="dk-btn" onClick={signOut}>Sign out here</button>
      </section>
    </div>
  )
}

/* ─────────────── the app ─────────────── */
function Desk({ me, refreshMe, signedOut }) {
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('today')
  const [sheet, setSheet] = useState(null)
  const [toastMsg, setToast] = useState('')
  const tRef = useRef()
  const toast = useCallback((m) => { setToast(m); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(''), 2600) }, [])
  const load = useCallback(async () => {
    try {
      const probe = await api('list?to=' + addDays(new Date().toISOString().slice(0, 10), 40))
      setD(probe)
      navigator.setAppBadge?.(probe.pending.length).catch?.(() => {})
    } catch (e) { if (e.status === 401) signedOut() }
  }, [signedOut])
  useEffect(() => {
    load()
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 30000)
    const vis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [load])

  if (!d) return <div className="dk-splash"><Logo ring className="dk-splash-logo" /></div>
  const today = d.now.date
  const live = d.bookings.filter((b) => ['pending', 'confirmed', 'done', 'noshow'].includes(b.status))
  const todays = live.filter((b) => b.date === today)
  const open = (b) => setSheet({ kind: 'booking', id: b.id })
  const current = sheet?.kind === 'booking' ? d.bookings.find((b) => b.id === sheet.id) || d.pending.find((b) => b.id === sheet.id) : null
  const nextUp = todays.find((b) => b.status === 'confirmed' && b.start + b.dur > d.now.minutes)

  const byDay = {}
  for (const b of d.bookings.filter((x) => ['pending', 'confirmed'].includes(x.status))) (byDay[b.date] ||= { b: [], k: [] }).b.push(b)
  for (const k of d.blocks) (byDay[k.date] ||= { b: [], k: [] }).k.push(k)
  const days = Object.keys(byDay).sort()

  return (
    <div className="dk-app">
      <header className="dk-top">
        <div><small>{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>{tab === 'today' ? 'Today' : tab === 'requests' ? 'Requests' : tab === 'calendar' ? 'Calendar' : 'Settings'}</h1></div>
        <Logo ring className="dk-top-logo" />
      </header>

      <main className="dk-main">
        {tab === 'today' && (
          <>
            {d.pending.length > 0 && <button className="dk-alert" onClick={() => setTab('requests')}><b>{d.pending.length}</b> new request{d.pending.length > 1 ? 's' : ''} waiting for you →</button>}
            {nextUp && <p className="dk-next">Next: <b>{nextUp.name}</b> at {fmtTime(nextUp.start)}</p>}
            {todays.length === 0 ? <div className="dk-empty"><b>No appointments today</b><span>Enjoy the quiet.</span></div> : todays.map((b) => <Row key={b.id} b={b} today={today} onOpen={open} />)}
          </>
        )}
        {tab === 'requests' && (d.pending.length === 0 ? <div className="dk-empty"><b>All caught up</b><span>New requests from the website appear here.</span></div> : d.pending.map((b) => <Row key={b.id} b={b} today={today} onOpen={open} />))}
        {tab === 'calendar' && (
          <>
            <div className="dk-bar"><button className="dk-btn dk-primary" onClick={() => setSheet({ kind: 'add' })}>+ Add appointment</button><button className="dk-btn" onClick={() => setSheet({ kind: 'off' })}>Time off</button></div>
            {days.length === 0 && <div className="dk-empty"><b>Nothing booked yet</b></div>}
            {days.map((date) => (
              <section key={date}>
                <h3 className="dk-day">{dayLabel(date, today)}<small>{byDay[date].b.length} appointment{byDay[date].b.length === 1 ? '' : 's'}</small></h3>
                {byDay[date].k.map((k) => <div className="dk-off" key={k.id}>Time off · {k.from === 0 && k.to === 1440 ? 'Whole day' : `${fmtTime(k.from)} – ${fmtTime(k.to)}`}{k.note ? ` · ${k.note}` : ''}</div>)}
                {byDay[date].b.map((b) => <Row key={b.id} b={b} today={date} onOpen={open} />)}
              </section>
            ))}
          </>
        )}
        {tab === 'more' && <More me={me} settings={d.settings} reload={load} refreshMe={refreshMe} signOut={async () => { await api('logout', { method: 'POST' }).catch(() => {}); signedOut() }} toast={toast} />}
      </main>

      <nav className="dk-tabs" aria-label="Sections">
        {[['today', 'Today'], ['requests', 'Requests'], ['calendar', 'Calendar'], ['more', 'Settings']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-current={tab === k}>
            {l}{k === 'requests' && d.pending.length > 0 && <i>{d.pending.length}</i>}
          </button>
        ))}
      </nav>

      {current && <BookingSheet key={current.id + current.status} b={current} today={today} onClose={() => setSheet(null)} onChange={load} tell={(kind, b) => setSheet({ kind: 'tell', tell: kind, b })} />}
      {sheet?.kind === 'tell' && <TellSheet kind={sheet.tell} b={sheet.b} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'add' && <AddSheet today={today} onClose={() => setSheet(null)} onChange={load} />}
      {sheet?.kind === 'off' && <TimeOffSheet today={today} blocks={d.blocks} onClose={() => setSheet(null)} onChange={load} />}
      {toastMsg && <div className="dk-toast" role="status">{toastMsg}</div>}
    </div>
  )
}

export default function App() {
  const [me, setMe] = useState(null)
  const refreshMe = useCallback(() => api('me').then(setMe).catch(() => setMe({ doctor: false, hasPasskey: false })), [])
  useEffect(() => { refreshMe() }, [refreshMe])
  if (!me) return <div className="dk-splash"><Logo ring className="dk-splash-logo" /></div>
  if (!me.doctor) return <Login me={me} onDone={refreshMe} />
  return <Desk me={me} refreshMe={refreshMe} signedOut={() => setMe({ doctor: false, hasPasskey: me.hasPasskey })} />
}
