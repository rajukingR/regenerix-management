import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from './api.js'
import { APPT_STATUS, Alert, Avatar, DataTable, Detail, Icon, Modal, PageHead, Pager, Person, Pill, SearchBox, Select, Toolbar, btn, btn2, btnDanger, fmtDate, fmtDateTime, inp, qs, t12 } from '../portal/ui.jsx'

export const STATUS = APPT_STATUS
export const Badge = ({ s, map = STATUS }) => <Pill s={s} map={map} />
const F0 = { q: '', status: '', service: '', team_id: '', assigned_to: '', date_from: '', date_to: '' }
const HIST = { created: 'Booked', assigned: 'Doctor assigned', unassigned: 'Doctor removed', ...STATUS }

export default function Appointments() {
  const [sp, setSp] = useSearchParams()
  const init = { ...F0, status: sp.get('status') || '', assigned_to: sp.get('assigned_to') || '' }
  const [f, setF] = useState(init); const [applied, setApplied] = useState(init); const [page, setPage] = useState(1); const [more, setMore] = useState(false)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([]); const [team, setTeam] = useState([]); const [doctors, setDoctors] = useState([])
  const [sel, setSel] = useState(null)

  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/appointments?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { api('/admin/services').then(setServices).catch(() => {}); api('/admin/team').then(setTeam).catch(() => {}); api('/admin/appointments/assignable').then((r) => setDoctors(r.data)).catch(() => {}) }, [])
  const view = useCallback(async (id) => { try { setSel((await api(`/admin/appointments/${id}`)).data) } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { const id = sp.get('open'); if (id) { view(id); setSp({}, { replace: true }) } else if (sp.get('status') || sp.get('assigned_to')) setSp({}, { replace: true }) }, [sp, setSp, view]) // opened from a notification / dashboard card
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const quick = (k) => (v) => { const n = { ...f, [k]: v }; setF(n); setApplied(n); setPage(1) }

  const cols = [
    { label: 'Patient', render: (a) => <Person name={a.name} sub={a.email} /> },
    { label: 'Reference', render: (a) => <span className="whitespace-nowrap font-mono text-xs">{a.reference}</span> },
    { label: 'Service', render: (a) => <>{a.service || '—'}{a.team_name && <span className="block text-xs text-ink/50">Prefers {a.team_name}</span>}</> },
    { label: 'Appointment', render: (a) => <span className="whitespace-nowrap">{fmtDate(a.appointment_date)}<span className="block text-xs text-ink/55">{t12(a.appointment_time)}</span></span> },
    { label: 'Mobile No', render: (a) => <span className="whitespace-nowrap">{a.phone}</span> },
    { label: 'Doctor', render: (a) => a.doctor_name ? <span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={a.doctor_name} src={a.doctor_image} size="h-8 w-8" />{a.doctor_name}</span> : <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Not assigned</span> },
    { label: 'Status', render: (a) => <Pill s={a.status} /> },
    { label: 'Action', render: (a) => <button className={btn2} onClick={() => view(a.id)}><Icon name="eye" className="h-4 w-4" />View</button>, className: 'text-right', head: 'text-right' },
  ]
  return (<div><PageHead title="Appointments List" sub="Assign each booking to a doctor. The doctor is notified and marks it completed or rejected." />
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center"><span className="text-sm font-semibold text-ink/70">Doctor:</span>
      <Select label="Doctor" value={f.assigned_to} onChange={quick('assigned_to')} className="sm:w-64"><option value="">All appointments</option><option value="none">Not assigned yet</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></div>
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      <Select label="Status" value={f.status} onChange={quick('status')}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      <SearchBox value={f.q} onChange={set('q')} placeholder="Search name, phone, reference…" />
      <button type="button" className={btn2} onClick={() => setMore(!more)}><Icon name="layers" className="h-4 w-4" />{more ? 'Fewer filters' : 'More filters'}</button>
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    {more && (<div className="mb-5 grid gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <Select label="Service" className="" value={f.service} onChange={set('service')}><option value="">All services</option>{services.map((s) => <option key={s.id}>{s.name}</option>)}</Select>
      <Select label="Preferred specialist" className="" value={f.team_id} onChange={set('team_id')}><option value="">Any preferred specialist</option>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
      <label className="text-xs text-ink/60">From<input type="date" className={inp} value={f.date_from} onChange={(e) => set('date_from')(e.target.value)} /></label>
      <label className="text-xs text-ink/60">To<input type="date" className={inp} value={f.date_to} onChange={(e) => set('date_to')(e.target.value)} /></label>
      <div className="flex items-end gap-2"><button type="button" className={btn} onClick={() => { setPage(1); setApplied(f) }}>Apply</button><button type="button" className={btn2} onClick={() => { setF(F0); setApplied(F0); setPage(1) }}>Reset</button></div></div>)}
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={1050} empty="No appointments found." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {sel && <AdminAppt a={sel} doctors={doctors} onClose={() => setSel(null)} onChanged={(x) => { if (x) setSel(x); else setSel(null); load() }} />}
  </div>)
}

function AdminAppt({ a, doctors, onClose, onChanged }) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const [doc, setDoc] = useState(a.assigned_to ? String(a.assigned_to) : ''); const [rs, setRs] = useState(null); const [slots, setSlots] = useState(null)
  useEffect(() => { setDoc(a.assigned_to ? String(a.assigned_to) : '') }, [a.assigned_to])
  useEffect(() => { if (!rs?.date) { setSlots(null); return undefined } let live = true; setSlots(null); api(`/public/appointments/slots?date=${rs.date}`).then((d) => live && setSlots(d.slots)).catch(() => live && setSlots([])); return () => { live = false } }, [rs?.date])
  const act = async (body, done) => { setBusy(true); setErr(''); setOk(''); try { const r = await api(`/admin/appointments/${a.id}`, { method: 'PUT', body: { ...body, note } }); setNote(''); setRs(null); setOk(done || 'Saved'); onChanged(r.data) } catch (e) { setErr(e.message) } setBusy(false) }
  const del = async () => { if (window.confirm('Delete this appointment permanently?')) { try { await api(`/admin/appointments/${a.id}`, { method: 'DELETE' }); onChanged(null) } catch (e) { setErr(e.message) } } }
  const S = ({ s, children, danger }) => <button className={danger ? btnDanger : btn2} disabled={busy || a.status === s} onClick={() => (s === 'cancelled' ? window.confirm('Cancel this appointment? The time slot will be released.') && act({ status: s }) : act({ status: s }))}>{children}</button>
  const docName = (id) => doctors.find((d) => String(d.id) === String(id))?.name
  return (<Modal wide title={a.name} sub={<span className="font-mono">{a.reference}</span>} onClose={onClose}>
    <div className="flex flex-wrap items-center gap-3"><Pill s={a.status} /><span className="text-sm text-ink/60">{fmtDate(a.appointment_date)} · {t12(a.appointment_time)}</span>{a.member_id && <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-ink/70">Member account</span>}</div>
    <Detail items={[['Phone', a.phone], ['Email', a.email], ['Service', a.service], ['Preferred specialist', a.team_name], ['Booked on', fmtDateTime(a.created_at)], ['Assigned on', a.assigned_at && fmtDateTime(a.assigned_at)], ['Reason', a.reason, true]]} />

    <section className="rounded-xl border border-teal/25 bg-mist/60 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon name="steth" className="h-4 w-4 text-teal-dark" />Assign to doctor</h3>
      {doctors.length ? (<div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className={`${inp} sm:flex-1`} value={doc} onChange={(e) => setDoc(e.target.value)} aria-label="Doctor"><option value="">— Not assigned —</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.role ? ` · ${d.role}` : ''}</option>)}</select>
        <button className={btn} disabled={busy || doc === (a.assigned_to ? String(a.assigned_to) : '')} onClick={() => act({ assigned_to: doc || null }, doc ? `Assigned to ${docName(doc)}. They have been notified.` : 'Doctor removed')}>{a.assigned_to ? (doc ? 'Reassign' : 'Remove') : 'Assign'}</button></div>)
        : <p className="mt-2 text-sm text-ink/65">No doctor logins yet. <Link to="/admin/doctors" className="font-semibold text-teal-dark underline">Create one under Doctors</Link>.</p>}
      {a.team_name && !a.assigned_to && <p className="mt-2 text-xs text-ink/55">The patient asked for {a.team_name}.</p>}
      {a.status === 'rejected' && <p className="mt-2 text-xs text-red-700">The doctor rejected this booking. Reassigning it reopens it as Confirmed.</p>}</section>

    <div><label className="text-xs font-medium text-ink/60">Note for the history (optional)<input className={`${inp} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="mt-3 flex flex-wrap gap-2"><S s="confirmed">Confirm</S><button className={btn2} disabled={busy} onClick={() => setRs({ date: '', time: '' })}>Reschedule</button><S s="completed">Mark completed</S><S s="no_show">No-show</S><S s="cancelled" danger>Cancel</S><button className={`${btnDanger} sm:ml-auto`} onClick={del}>Delete</button></div></div>
    {rs && (<div className="rounded-xl bg-mist p-4"><label className="text-xs text-ink/60">New date<input type="date" className={inp} min={new Date().toISOString().slice(0, 10)} value={rs.date} onChange={(e) => setRs({ date: e.target.value, time: '' })} /></label>
      {rs.date && (slots === null ? <p className="mt-2 text-sm">Checking availability…</p> : !slots.length ? <p className="mt-2 text-sm">No slots on this date.</p> : <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((s) => <button key={s.time} disabled={!s.available} onClick={() => setRs({ ...rs, time: s.time })} className={`rounded-md border px-2 py-1.5 text-xs ${rs.time === s.time ? 'border-teal bg-teal text-white' : s.available ? 'border-ink/20 bg-white' : 'bg-field text-ink/30 line-through'}`}>{t12(s.time)}</button>)}</div>)}
      <div className="mt-3 flex gap-2"><button className={btn} disabled={busy || !rs.date || !rs.time} onClick={() => act({ appointment_date: rs.date, appointment_time: rs.time }, 'Rescheduled')}>Save new time</button><button className={btn2} onClick={() => setRs(null)}>Cancel</button></div></div>)}
    {ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>}
    {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    <div><h3 className="mb-3 text-sm font-semibold">History</h3><ol className="space-y-3 border-l-2 border-ink/10 pl-4">{a.history.map((h) => (<li key={h.id} className="relative text-sm"><span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${h.by_role === 'doctor' ? 'bg-ink' : 'bg-teal'}`} />
      <p><b>{HIST[h.action] || h.action}</b>{h.by_name && <span className="text-ink/55"> · {h.by_name}{h.by_role === 'doctor' ? ' (doctor)' : ''}</span>}</p>{h.note && <p className="text-ink/70">{h.note}</p>}<p className="text-xs text-ink/45">{fmtDateTime(h.created_at)}</p></li>))}</ol></div>
  </Modal>)
}
