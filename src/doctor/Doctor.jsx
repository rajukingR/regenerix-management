import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { clearToken, doctorApi as api, loggedIn } from '../portal/api.js'
import Shell from '../portal/Shell.jsx'
import Bell, { parse } from '../portal/Bell.jsx'
import NotificationsPage from '../portal/Notifications.jsx'
import { APPT_STATUS, Alert, Avatar, Card, DataTable, Detail, Icon, Loading, Modal, PageHead, Pager, Person, Pill, SearchBox, Select, StatCard, Tabs, Toolbar, btn, btn2, btnDanger, fmtDate, fmtDateTime, inp, qs, t12 } from '../portal/ui.jsx'

const target = (n) => { const d = parse(n.detail); return d.appointment_id ? `/doctor/appointments?open=${d.appointment_id}` : '/doctor/appointments' }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function DoctorLayout() {
  const nav = useNavigate(); const [me, setMe] = useState(null)
  const ok = loggedIn('doctor')
  useEffect(() => { if (ok) api('/auth/me').then((m) => (m.role === 'doctor' ? setMe(m) : (clearToken('doctor'), nav('/doctor/login')))).catch(() => {}) }, [ok, nav])
  if (!ok) return <Navigate to="/doctor/login" replace />
  const groups = [
    { heading: 'Main menu', items: [{ to: '/doctor', label: 'Dashboard', icon: 'grid', end: true }] },
    { heading: 'Appointments', items: [{ to: '/doctor/appointments', label: 'My Appointments', icon: 'calendar' }, { to: '/doctor/notifications', label: 'Notifications', icon: 'bell' }] },
  ]
  const name = me?.team?.name || me?.name || 'Doctor'
  return <Shell portal={{ key: 'doctor', label: 'Doctor portal' }} groups={groups} bottom={[{ to: '/doctor/profile', label: 'Profile & password', icon: 'settings' }]}
    user={{ name, sub: me?.team?.role, image: me?.team?.image_url, to: '/doctor/profile' }} title="Dashboard"
    bell={<Bell api={api} base="/doctor" target={target} all="/doctor/notifications" />} onLogout={() => { clearToken('doctor'); nav('/doctor/login') }} />
}

export function DoctorHome() {
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  const load = useCallback(() => api('/doctor/dashboard').then((x) => { setD(x); setErr('') }).catch((e) => setErr(e.message)), [])
  useEffect(() => { load(); const t = setInterval(() => document.visibilityState === 'visible' && load(), 30000); return () => clearInterval(t) }, [load])
  if (!d) return err ? <Alert onRetry={load}>{err}</Alert> : <Loading />
  const s = d.stats
  return (<div>
    <h2 className="mb-4 text-2xl font-bold text-ink md:text-[26px]">Welcome back, {d.profile?.name || 'Doctor'}!</h2>
    {s.overdue > 0 && <Link to="/doctor/appointments?tab=overdue" className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Icon name="alert" className="h-5 w-5 shrink-0" /><span className="flex-1"><b>{s.overdue}</b> past appointment{s.overdue === 1 ? ' is' : 's are'} still open. Mark {s.overdue === 1 ? 'it' : 'them'} completed or rejected.</span><Icon name="right" className="h-4 w-4" /></Link>}
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      <StatCard label="Today's Appointments" value={s.today} icon="clock" to="/doctor/appointments?tab=today" />
      <StatCard label="Upcoming" value={s.upcoming} icon="calendar" to="/doctor/appointments?tab=upcoming" />
      <StatCard label="Completed" value={s.completed} icon="checkCircle" to="/doctor/appointments?tab=completed" />
      <StatCard label="Rejected" value={s.rejected} icon="xCircle" to="/doctor/appointments?tab=rejected" />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <Card className="!p-0"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h3 className="text-lg">Next appointments</h3><Link to="/doctor/appointments?tab=upcoming" className="text-sm font-medium text-teal-dark hover:underline">View all</Link></div>
        <ul>{d.upcoming.map((a) => (<li key={a.id} className="border-b border-ink/10 last:border-0"><Link to={`/doctor/appointments?open=${a.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-mist">
          <div className="w-16 shrink-0 rounded-lg bg-mist py-2 text-center"><p className="text-[11px] font-semibold uppercase text-ink/55">{new Date(`${a.appointment_date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p><p className="text-xl font-bold leading-none text-ink">{String(a.appointment_date).slice(8, 10)}</p></div>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.name}</p><p className="truncate text-sm text-ink/60">{a.service || 'Consultation'} · {t12(a.appointment_time)}</p></div><Pill s={a.status} /></Link></li>))}
          {!d.upcoming.length && <li className="px-5 py-12 text-center text-sm text-ink/50">No upcoming appointments assigned to you.</li>}</ul></Card>
      <Card><h3 className="text-lg">Summary</h3><dl className="mt-4 space-y-3 text-sm">{[['Total assigned', s.total], ['Open (upcoming)', s.upcoming], ['Past, still open', s.overdue], ['Completed', s.completed], ['Rejected', s.rejected]].map(([k, v]) => <div key={k} className="flex items-center justify-between border-b border-ink/5 pb-3 last:border-0"><dt className="text-ink/65">{k}</dt><dd className="text-lg font-bold">{v}</dd></div>)}</dl></Card>
    </div></div>)
}

const TABS = { upcoming: { when: 'upcoming' }, today: { when: 'today' }, overdue: { when: 'overdue' }, all: {}, completed: { status: 'completed' }, rejected: { status: 'rejected' } }
export function DoctorAppointments() {
  const [sp, setSp] = useSearchParams(); const [tab, setTab] = useState(TABS[sp.get('tab')] ? sp.get('tab') : 'upcoming')
  const [q, setQ] = useState(''); const [applied, setApplied] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [sel, setSel] = useState(null)
  const filt = useCallback(() => ({ ...TABS[tab], ...(status && tab === 'all' ? { status } : {}) }), [tab, status])
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/doctor/appointments?${qs({ ...filt(), q: applied, page, limit: 10 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [filt, applied, page])
  useEffect(() => { load() }, [load])
  const view = useCallback(async (id) => { try { setSel((await api(`/doctor/appointments/${id}`)).data) } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { const id = sp.get('open'); if (id) { view(id); setSp({}, { replace: true }) } }, [sp, setSp, view])
  useEffect(() => { const f = () => load(); window.addEventListener('NEW_NOTIFICATION', f); return () => window.removeEventListener('NEW_NOTIFICATION', f) }, [load])
  const pick = (k) => { setTab(k); setPage(1); setStatus('') }

  const cols = [
    { label: 'Patient', render: (a) => <Person name={a.name} sub={a.email} /> },
    { label: 'Reference', render: (a) => <span className="whitespace-nowrap font-mono text-xs">{a.reference}</span> },
    { label: 'Service', render: (a) => a.service || '—' },
    { label: 'Date & time', render: (a) => <span className="whitespace-nowrap">{fmtDate(a.appointment_date)}<span className="block text-xs text-ink/55">{t12(a.appointment_time)}</span></span> },
    { label: 'Mobile No', render: (a) => <a href={`tel:${a.phone}`} className="whitespace-nowrap hover:text-teal-dark">{a.phone}</a> },
    { label: 'Status', render: (a) => <Pill s={a.status} /> },
    { label: 'Action', render: (a) => <button className={btn2} onClick={() => view(a.id)}><Icon name="eye" className="h-4 w-4" />View</button>, className: 'text-right', head: 'text-right' },
  ]
  return (<div><PageHead title="My Appointments" sub="Appointments the admin has assigned to you." />
    <Tabs value={tab} onChange={pick} items={[['upcoming', 'Upcoming'], ['today', 'Today'], ['overdue', 'Past & open'], ['completed', 'Completed'], ['rejected', 'Rejected'], ['all', 'All']]} />
    <Toolbar onSubmit={() => { setPage(1); setApplied(q) }}>
      {tab === 'all' && <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }}><option value="">All statuses</option>{Object.entries(APPT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
      <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, reference…" /><button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 10} loading={loading} empty="No appointments here." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {sel && <DoctorAppt a={sel} onClose={() => setSel(null)} onSaved={(x) => { setSel(x); load() }} />}
  </div>)
}

function DoctorAppt({ a, onClose, onSaved }) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [mode, setMode] = useState(null)
  const open = ['pending', 'confirmed', 'rescheduled'].includes(a.status), future = String(a.appointment_date).slice(0, 10) > today()
  const save = async (status) => { setBusy(true); setErr(''); try { const r = await api(`/doctor/appointments/${a.id}`, { method: 'PUT', body: { status, note } }); setNote(''); setMode(null); onSaved(r.data) } catch (e) { setErr(e.message) } setBusy(false) }
  return (<Modal wide title={a.name} sub={<span className="font-mono">{a.reference}</span>} onClose={onClose}
    footer={open ? (mode ? <><button className={btn2} onClick={() => { setMode(null); setErr('') }} disabled={busy}>Back</button>
      <button className={mode === 'rejected' ? `${btn} !bg-red-600 hover:!bg-red-700` : btn} disabled={busy || (mode === 'rejected' && note.trim().length < 3)} onClick={() => save(mode)}>{busy ? 'Saving…' : mode === 'completed' ? 'Confirm completed' : 'Confirm rejection'}</button></>
      : <><button className={btnDanger} onClick={() => setMode('rejected')}><Icon name="xCircle" className="h-4 w-4" />Reject</button>
        <button className={btn} disabled={future} title={future ? 'Available on the appointment date' : undefined} onClick={() => setMode('completed')}><Icon name="checkCircle" className="h-4 w-4" />Mark completed</button></>) : <button className={btn2} onClick={onClose}>Close</button>}>
    <div className="flex flex-wrap items-center gap-3"><Pill s={a.status} /><span className="text-sm text-ink/60">{fmtDate(a.appointment_date)} · {t12(a.appointment_time)}</span></div>
    <Detail items={[['Mobile', <a key="p" href={`tel:${a.phone}`} className="text-teal-dark hover:underline">{a.phone}</a>], ['Email', a.email], ['Service', a.service], ['Preferred specialist', a.team_name], ['Booked on', fmtDateTime(a.created_at)], ['Assigned on', fmtDateTime(a.assigned_at)], ['Reason for visit', a.reason, true], a.notes && ['Admin notes', a.notes, true]]} />
    {open && future && !mode && <p className="rounded-lg bg-mist px-3 py-2 text-xs text-ink/70">You can mark this appointment completed on or after {fmtDate(a.appointment_date)}. You can reject it at any time.</p>}
    {mode && <label className="block text-sm font-semibold">{mode === 'rejected' ? 'Reason for rejecting (required — the admin and patient will see it)' : 'Note (optional)'}
      <textarea rows={3} autoFocus className={`${inp} mt-1.5`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'rejected' ? 'e.g. Not available on this date' : 'e.g. Follow-up in 2 weeks'} /></label>}
    {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    <div><h3 className="mb-3 text-sm font-semibold">History</h3><ol className="space-y-3 border-l-2 border-ink/10 pl-4">{a.history.map((h) => (<li key={h.id} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal" />
      <p><b className="capitalize">{APPT_STATUS[h.action] || h.action}</b>{h.by_name ? <span className="text-ink/55"> · {h.by_name}</span> : null}</p>{h.note && <p className="text-ink/70">{h.note}</p>}<p className="text-xs text-ink/45">{fmtDateTime(h.created_at)}</p></li>))}</ol></div>
  </Modal>)
}

export function DoctorNotifications() { return <NotificationsPage api={api} base="/doctor" target={target} /> }

export function DoctorProfile() {
  const [me, setMe] = useState(null); const [pw, setPw] = useState({ current: '', next: '', again: '' }); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { api('/auth/me').then(setMe).catch((e) => setErr(e.message)) }, [])
  const change = async (e) => {
    e.preventDefault(); setMsg(''); setErr('')
    if (pw.next !== pw.again) return setErr('The new passwords do not match')
    setBusy(true); try { await api('/auth/password', { method: 'PUT', body: { current: pw.current, next: pw.next } }); setPw({ current: '', next: '', again: '' }); setMsg('Password changed') } catch (x) { setErr(x.message) } setBusy(false)
  }
  if (!me) return err ? <Alert>{err}</Alert> : <Loading />
  return (<div className="max-w-3xl"><PageHead title="Profile & password" />
    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
      <Card><div className="flex flex-col items-center text-center"><Avatar name={me.team?.name || me.name} src={me.team?.image_url} size="h-24 w-24" /><h2 className="mt-4 text-xl">{me.team?.name || me.name}</h2><p className="text-sm text-ink/60">{me.team?.role}</p></div>
        <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-ink/55">Login email</dt><dd className="truncate">{me.email}</dd></div>{me.phone && <div className="flex justify-between"><dt className="text-ink/55">Phone</dt><dd>{me.phone}</dd></div>}</dl>
        <p className="mt-4 text-xs text-ink/50">Your name and photo come from the Team page. Ask the admin to change them.</p></Card>
      <Card><form onSubmit={change} className="space-y-4"><h2 className="text-lg">Change password</h2>
        {msg && <p role="status" className="rounded-lg bg-mist px-3 py-2 text-sm">{msg}</p>}{err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <input type="password" required autoComplete="current-password" placeholder="Current password" className={inp} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (min 8 characters)" className={inp} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat new password" className={inp} value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} />
        <button className={btn} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form></Card></div></div>)
}
