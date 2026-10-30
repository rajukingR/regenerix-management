import { useCallback, useEffect, useMemo, useState } from 'react'
import { useData } from '../siteContext.jsx'
import { apiGet, apiPost } from '../lib/api.js'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const label = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` }
const EMPTY = { name: '', email: '', phone: '', service: '', team_id: '', appointment_date: '', appointment_time: '', reason: '' }

// prefill: { name, email, phone } when used inside the member dashboard
export default function AppointmentForm({ prefill } = {}) {
  const { SERVICES, TEAM } = useData()
  const start = useMemo(() => ({ ...EMPTY, ...(prefill || {}) }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [v, setV] = useState(start); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [done, setDone] = useState(null)
  const [slots, setSlots] = useState(null); const [slotErr, setSlotErr] = useState('')
  const min = useMemo(() => ymd(new Date()), [])
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value, ...(k === 'appointment_date' ? { appointment_time: '' } : {}) }))

  const loadSlots = useCallback(async (date, signal) => {
    setSlots(null); setSlotErr('')
    try { setSlots((await apiGet(`/api/public/appointments/slots?date=${date}`, signal)).slots) } catch (e) { if (e.name !== 'AbortError') setSlotErr(e.message) }
  }, [])
  useEffect(() => { if (!v.appointment_date) return undefined; const c = new AbortController(); loadSlots(v.appointment_date, c.signal); return () => c.abort() }, [v.appointment_date, loadSlots])

  const submit = async (e) => {
    e.preventDefault(); if (busy) return // blocks accidental double submission
    const x = {}
    if (!v.name.trim()) x.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(v.email)) x.email = 'Enter a valid email address.'
    if (!/^[+\d][\d\s-]{7,14}$/.test(v.phone)) x.phone = 'Enter a valid mobile number.'
    if (!v.service) x.service = 'Choose a service.'
    if (!v.appointment_date) x.appointment_date = 'Choose a date.'
    if (v.appointment_date && !v.appointment_time) x.appointment_time = 'Choose a time slot.'
    setErr(x); setMsg(''); if (Object.keys(x).length) return
    setBusy(true)
    try { setDone(await apiPost('/api/public/appointments', { ...v, team_id: v.team_id || null })); setV(start); window.dispatchEvent(new Event('NEW_NOTIFICATION')) }
    catch (ex) { setMsg(ex.message); if (ex.status === 409) { setV((y) => ({ ...y, appointment_time: '' })); loadSlots(v.appointment_date) } }
    setBusy(false)
  }

  if (done) return (<div role="status" className="rounded-xl bg-mist p-6"><h3 className="text-xl text-teal">Appointment requested</h3>
    <p className="mt-2 text-sm">Reference <b>{done.reference}</b> · {done.appointment_date} at {label(done.appointment_time)}</p>
    <p className="mt-2 text-sm text-ink/70">Our team will confirm your booking shortly.</p><button className="btn mt-5" onClick={() => setDone(null)}>Book another</button></div>)

  const Err = ({ k }) => err[k] ? <span className="text-sm text-red-600">{err[k]}</span> : null
  return (<form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
    <label><input className="input" placeholder="Name *" aria-label="Name" value={v.name} onChange={set('name')} /><Err k="name" /></label>
    <label><input type="email" className="input" placeholder="Email *" aria-label="Email" value={v.email} onChange={set('email')} /><Err k="email" /></label>
    <label><input className="input" placeholder="Phone Number *" aria-label="Phone number" value={v.phone} onChange={set('phone')} /><Err k="phone" /></label>
    <label><select className="input" aria-label="Service" value={v.service} onChange={set('service')}><option value="">Select Service *</option>{SERVICES.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}</select><Err k="service" /></label>
    {TEAM.length > 0 && <label className="sm:col-span-2"><select className="input" aria-label="Preferred specialist" value={v.team_id} onChange={set('team_id')}><option value="">Preferred specialist (optional)</option>{TEAM.map((t) => <option key={t.id} value={t.dbId}>{t.name}</option>)}</select></label>}
    <label className="sm:col-span-2"><span className="mb-1 block text-xs text-ink/60">Preferred date *</span><input type="date" min={min} className="input" value={v.appointment_date} onChange={set('appointment_date')} /><Err k="appointment_date" /></label>
    {v.appointment_date && (<fieldset className="sm:col-span-2"><legend className="mb-2 text-xs text-ink/60">Available times *</legend>
      {slotErr ? <p className="text-sm text-red-600">{slotErr} <button type="button" className="underline" onClick={() => loadSlots(v.appointment_date)}>Retry</button></p>
        : !slots ? <p className="text-sm text-ink/60">Checking availability…</p>
        : !slots.length ? <p className="text-sm text-ink/60">No appointments are available on this date. Please choose another day.</p>
        : <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((s) => (<button type="button" key={s.time} disabled={!s.available} aria-pressed={v.appointment_time === s.time} onClick={() => setV((x) => ({ ...x, appointment_time: s.time }))}
          className={`rounded-md border px-2 py-2 text-sm transition ${v.appointment_time === s.time ? 'border-teal bg-teal text-white' : s.available ? 'border-ink/20 hover:border-teal' : 'cursor-not-allowed border-transparent bg-field text-ink/30 line-through'}`}>{label(s.time)}</button>))}</div>}
      <Err k="appointment_time" /></fieldset>)}
    <label className="sm:col-span-2"><textarea rows="3" className="input" placeholder="Reason for appointment (optional)" aria-label="Reason" value={v.reason} onChange={set('reason')} /></label>
    {msg && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{msg}</p>}
    <button className="btn sm:col-span-2 sm:justify-self-start" disabled={busy}>{busy ? 'Booking…' : 'Book appointment'}</button>
  </form>)
}
