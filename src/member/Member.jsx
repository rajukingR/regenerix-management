import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { clearToken, loggedIn, memberApi as api } from '../portal/api.js'
import Shell from '../portal/Shell.jsx'
import Bell, { parse } from '../portal/Bell.jsx'
import NotificationsPage from '../portal/Notifications.jsx'
import { APPT_STATUS, APP_STATUS, Alert, Avatar, Card, DataTable, Detail, Icon, Loading, Modal, PageHead, Pager, Pill, StatCard, Tabs, ago, btn, btn2, fmtDate, fmtDateTime, inp, qs, t12 } from '../portal/ui.jsx'
import { SiteProvider } from '../siteContext.jsx'
import AppointmentForm from '../components/AppointmentForm.jsx'

const target = (n) => {
  const d = parse(n.detail)
  if (d.application_id) return `/member/applications?open=${d.application_id}`
  if (d.appointment_id) return `/member/appointments?open=${d.appointment_id}`
  return '/member/notifications'
}

export function MemberLayout() {
  const nav = useNavigate(); const [me, setMe] = useState(null); const ok = loggedIn('member')
  const reload = useCallback(() => api('/member/me').then((r) => setMe(r.member)).catch(() => {}), [])
  useEffect(() => { if (ok) reload() }, [ok, reload])
  if (!ok) return <Navigate to="/member/login" replace />
  const groups = [
    { heading: 'Main menu', items: [{ to: '/member', label: 'Dashboard', icon: 'grid', end: true }] },
    { heading: 'My care', items: [{ to: '/member/appointments', label: 'My Appointments', icon: 'calendar' }, { to: '/member/book', label: 'Book Appointment', icon: 'plus' }] },
    { heading: 'Careers', items: [{ to: '/member/applications', label: 'My Applications', icon: 'brief' }, { to: '/careers', label: 'Browse Jobs', icon: 'search', external: true }] },
    { heading: 'Updates', items: [{ to: '/member/notifications', label: 'Notifications', icon: 'bell' }] },
  ]
  return <Shell portal={{ key: 'member', label: 'My account' }} groups={groups} bottom={[{ to: '/member/profile', label: 'Profile & password', icon: 'settings' }]}
    user={{ name: me?.name || 'My account', sub: me?.email, to: '/member/profile' }} title="Dashboard" context={{ me, reload }}
    bell={<Bell api={api} base="/member" target={target} all="/member/notifications" />} onLogout={() => { clearToken('member'); nav('/member/login') }} />
}

export function MemberHome() {
  const [d, setD] = useState(null); const [me, setMe] = useState(null); const [err, setErr] = useState('')
  const load = useCallback(() => Promise.all([api('/member/dashboard'), api('/member/me')]).then(([x, m]) => { setD(x); setMe(m.member); setErr('') }).catch((e) => setErr(e.message)), [])
  useEffect(() => { load(); const f = () => load(); window.addEventListener('NOTIFICATIONS_CHANGED', f); return () => window.removeEventListener('NOTIFICATIONS_CHANGED', f) }, [load])
  if (!d) return err ? <Alert onRetry={load}>{err}</Alert> : <Loading />
  const a = d.appointments, j = d.applications
  return (<div>
    <h2 className="mb-4 text-2xl font-bold text-ink md:text-[26px]">Welcome back, {me?.name}!</h2>
    <div className="mb-6 flex flex-wrap gap-2"><Link to="/member/book" className={btn}><Icon name="plus" className="h-4 w-4" />Book appointment</Link><a href="/careers" className={btn2}><Icon name="brief" className="h-4 w-4" />Browse jobs</a></div>
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      <StatCard label="Upcoming Appointments" value={a.upcoming} icon="calendar" to="/member/appointments" />
      <StatCard label="Completed Visits" value={a.completed} icon="checkCircle" to="/member/appointments?tab=past" />
      <StatCard label="Job Applications" value={j.total} icon="brief" to="/member/applications" />
      <StatCard label="Shortlisted" value={j.shortlisted} icon="userCheck" to="/member/applications" />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <Card className="!p-0"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h3 className="text-lg">Upcoming appointments</h3><Link to="/member/appointments" className="text-sm font-medium text-teal-dark hover:underline">View all</Link></div>
        <ul>{a.next.map((x) => (<li key={x.id} className="border-b border-ink/10 last:border-0"><Link to={`/member/appointments?open=${x.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-mist">
          <div className="w-16 shrink-0 rounded-lg bg-mist py-2 text-center"><p className="text-[11px] font-semibold uppercase text-ink/55">{new Date(`${x.appointment_date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p><p className="text-xl font-bold leading-none">{String(x.appointment_date).slice(8, 10)}</p></div>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.service || 'Consultation'}</p><p className="truncate text-sm text-ink/60">{t12(x.appointment_time)}{x.doctor_name ? ` · ${x.doctor_name}` : ' · Doctor to be assigned'}</p></div><Pill s={x.status} /></Link></li>))}
          {!a.next.length && <li className="px-5 py-12 text-center text-sm text-ink/50">No upcoming appointments. <Link to="/member/book" className="font-medium text-teal-dark hover:underline">Book one</Link></li>}</ul></Card>
      <Card className="!p-0"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h3 className="text-lg">Latest updates</h3><Link to="/member/notifications" className="text-sm font-medium text-teal-dark hover:underline">View all</Link></div>
        <ul>{d.notifications.map((n) => (<li key={n.id} className="border-b border-ink/10 last:border-0"><Link to={target(n)} className={`flex gap-3 px-5 py-4 transition hover:bg-mist ${n.is_read ? '' : 'bg-teal/5'}`}>
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? 'bg-ink/15' : 'bg-teal'}`} /><span className="min-w-0 flex-1"><span className={`block text-sm ${n.is_read ? 'text-ink/75' : 'font-semibold'}`}>{n.message}</span><span className="text-xs text-ink/45">{ago(n.created_at)}</span></span></Link></li>))}
          {!d.notifications.length && <li className="px-5 py-12 text-center text-sm text-ink/50">Updates about your appointments and applications will appear here.</li>}</ul></Card>
    </div>
    {a.total === 0 && j.total === 0 && <p className="mt-6 rounded-xl border border-dashed border-ink/20 bg-white px-5 py-4 text-sm text-ink/65">Booked or applied before creating this account? Records made with the same email <b>and</b> mobile number ({me?.phone}) are added automatically. Check your mobile number under <Link to="/member/profile" className="font-medium text-teal-dark hover:underline">Profile</Link>.</p>}
  </div>)
}

export function MemberAppointments() {
  const [sp, setSp] = useSearchParams(); const [tab, setTab] = useState(sp.get('tab') === 'past' ? 'past' : sp.get('tab') === 'all' ? 'all' : 'upcoming'); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [sel, setSel] = useState(null)
  const filt = tab === 'upcoming' ? { when: 'upcoming' } : tab === 'past' ? { status: 'completed' } : {}
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/member/appointments?${qs({ ...filt, page, limit: 10 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [tab, page]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])
  const view = useCallback(async (id) => { try { setSel((await api(`/member/appointments/${id}`)).data) } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { const id = sp.get('open'); if (id) { view(id); setSp({}, { replace: true }) } }, [sp, setSp, view])
  const cols = [
    { label: 'Reference', render: (a) => <span className="whitespace-nowrap font-mono text-xs">{a.reference}</span> },
    { label: 'Service', render: (a) => <span className="font-medium">{a.service || 'Consultation'}</span> },
    { label: 'Date & time', render: (a) => <span className="whitespace-nowrap">{fmtDate(a.appointment_date)}<span className="block text-xs text-ink/55">{t12(a.appointment_time)}</span></span> },
    { label: 'Doctor', render: (a) => a.doctor_name ? <span className="flex items-center gap-2"><Avatar name={a.doctor_name} src={a.doctor_image} size="h-8 w-8" />{a.doctor_name}</span> : <span className="text-ink/45">To be assigned</span> },
    { label: 'Status', render: (a) => <Pill s={a.status} /> },
    { label: 'Action', render: (a) => <button className={btn2} onClick={() => view(a.id)}><Icon name="eye" className="h-4 w-4" />View</button>, className: 'text-right', head: 'text-right' },
  ]
  return (<div><PageHead title="My Appointments"><Link to="/member/book" className={btn}><Icon name="plus" className="h-4 w-4" />Book appointment</Link></PageHead>
    <Tabs value={tab} onChange={(k) => { setTab(k); setPage(1) }} items={[['upcoming', 'Upcoming'], ['past', 'Completed'], ['all', 'All']]} />
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 10} loading={loading} minWidth={700} empty={tab === 'upcoming' ? 'No upcoming appointments.' : 'No appointments yet.'} />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {sel && (<Modal wide title={sel.service || 'Appointment'} sub={<span className="font-mono">{sel.reference}</span>} onClose={() => setSel(null)} footer={<button className={btn2} onClick={() => setSel(null)}>Close</button>}>
      <div className="flex flex-wrap items-center gap-3"><Pill s={sel.status} /><span className="text-sm text-ink/60">{fmtDate(sel.appointment_date)} · {t12(sel.appointment_time)}</span></div>
      <Detail items={[['Doctor', sel.doctor_name || 'To be assigned'], ['Preferred specialist', sel.team_name], ['Name', sel.name], ['Mobile', sel.phone], ['Booked on', fmtDateTime(sel.created_at)], ['Reason', sel.reason, true]]} />
      {sel.status === 'rejected' && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">This appointment could not go ahead. Our team will contact you, or you can <Link to="/member/book" className="font-semibold underline">book another time</Link>.</p>}
      <div><h3 className="mb-3 text-sm font-semibold">Timeline</h3><ol className="space-y-3 border-l-2 border-ink/10 pl-4">{sel.history.map((h) => (<li key={h.id} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal" />
        <p className="font-semibold">{h.action === 'created' ? 'Booked' : h.action === 'assigned' ? 'Doctor assigned' : h.action === 'unassigned' ? 'Doctor changed' : APPT_STATUS[h.action] || h.action}</p>{h.note && <p className="text-ink/70">{h.note}</p>}<p className="text-xs text-ink/45">{fmtDateTime(h.created_at)}</p></li>))}</ol></div>
    </Modal>)}
  </div>)
}

export function MemberBook() {
  const { me } = useOutletContext() || {}
  return (<div className="max-w-3xl"><PageHead title="Book Appointment" sub="Choose a service, date and time. You will get a notification here when it is confirmed and when a doctor is assigned." />
    <Card className="md:p-7"><SiteProvider>{me ? <AppointmentForm key={me.id} prefill={{ name: me.name, email: me.email, phone: me.phone }} /> : <Loading />}</SiteProvider></Card></div>)
}

const STEPS = ['new', 'under_review', 'shortlisted', 'interview', 'selected']
function Progress({ s }) {
  if (s === 'rejected') return <div className="flex items-center gap-2 text-sm text-red-700"><Icon name="xCircle" className="h-4 w-4" />Not shortlisted this time</div>
  const at = STEPS.indexOf(s)
  return (<ol className="flex items-center gap-1" aria-label={`Status: ${APP_STATUS[s] || s}`}>{STEPS.map((k, i) => (<li key={k} className="flex flex-1 flex-col gap-1.5"><span className={`h-1.5 rounded-full ${i <= at ? 'bg-teal' : 'bg-ink/10'}`} /><span className={`hidden text-[11px] sm:block ${i === at ? 'font-semibold text-ink' : 'text-ink/45'}`}>{APP_STATUS[k]}</span></li>))}</ol>)
}
export function MemberApplications() {
  const [sp, setSp] = useSearchParams(); const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [sel, setSel] = useState(null)
  const load = useCallback(() => api('/member/applications').then((r) => { setRows(r.data); setErr('') }).catch((e) => setErr(e.message)), [])
  useEffect(() => { load() }, [load])
  useEffect(() => { const id = sp.get('open'); if (id) { api(`/member/applications/${id}`).then((r) => setSel(r.data)).catch((e) => setErr(e.message)); setSp({}, { replace: true }) } }, [sp, setSp])
  if (!rows) return err ? <Alert onRetry={load}>{err}</Alert> : <Loading />
  return (<div><PageHead title="My Applications" sub="We update the status here, and notify you, as soon as your resume is reviewed."><a href="/careers" className={btn}><Icon name="search" className="h-4 w-4" />Browse open jobs</a></PageHead>
    <Alert onRetry={load}>{err}</Alert>
    <div className="grid gap-4 lg:grid-cols-2">{rows.map((a) => (<Card key={a.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg">{a.job_title || 'General application'}</h3>
        <p className="text-sm text-ink/55">{[a.department, a.location].filter(Boolean).join(' · ') || 'Regenerix'} · Applied {fmtDate(a.created_at)}</p></div><Pill s={a.status} map={APP_STATUS} /></div>
      <div className="mt-5"><Progress s={a.status} /></div>
      {a.status_note && <p className="mt-4 rounded-lg bg-mist px-3 py-2 text-sm text-ink/80"><b>Message from Regenerix:</b> {a.status_note}</p>}
      <div className="mt-4 flex justify-end"><button className={btn2} onClick={() => setSel(a)}><Icon name="eye" className="h-4 w-4" />Details</button></div></Card>))}
      {!rows.length && <Card className="lg:col-span-2"><div className="py-8 text-center"><p className="text-ink/60">You have not applied for a job yet.</p><a href="/careers" className={`${btn} mt-4`}>See open positions</a></div></Card>}</div>
    {sel && (<Modal title={sel.job_title || 'General application'} sub={`Applied ${fmtDateTime(sel.created_at)}`} onClose={() => setSel(null)} footer={<button className={btn2} onClick={() => setSel(null)}>Close</button>}>
      <Pill s={sel.status} map={APP_STATUS} /><Progress s={sel.status} />
      <Detail items={[['Department', sel.department], ['Location', sel.location], ['Experience', sel.experience], ['Resume', sel.resume_name], ['Last updated', fmtDateTime(sel.updated_at)], sel.status_note && ['Message from Regenerix', sel.status_note, true], ['Cover letter', sel.cover_letter, true]]} />
    </Modal>)}
  </div>)
}

export function MemberNotifications() { return <NotificationsPage api={api} base="/member" target={target} /> }

export function MemberProfile() {
  const ctx = useOutletContext() || {}
  const [f, setF] = useState(null); const [pw, setPw] = useState({ current: '', next: '', again: '' }); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  useEffect(() => { api('/member/me').then((r) => setF({ name: r.member.name, phone: r.member.phone, email: r.member.email })).catch((e) => setErr(e.message)) }, [])
  const save = async (e) => { e.preventDefault(); setMsg(''); setErr(''); try { await api('/member/me', { method: 'PUT', body: { name: f.name, phone: f.phone } }); setMsg('Profile saved'); ctx.reload?.() } catch (x) { setErr(x.message) } }
  const change = async (e) => { e.preventDefault(); setMsg(''); setErr(''); if (pw.next !== pw.again) return setErr('The new passwords do not match'); try { await api('/member/password', { method: 'PUT', body: { current: pw.current, next: pw.next } }); setPw({ current: '', next: '', again: '' }); setMsg('Password changed') } catch (x) { setErr(x.message) } }
  if (!f) return err ? <Alert>{err}</Alert> : <Loading />
  return (<div className="max-w-3xl"><PageHead title="Profile & password" />
    {msg && <p role="status" className="mb-4 rounded-lg bg-mist px-4 py-3 text-sm">{msg}</p>}<Alert>{err}</Alert>
    <div className="grid gap-5 md:grid-cols-2">
      <Card><form onSubmit={save} className="space-y-4"><h2 className="text-lg">Your details</h2>
        <label className="block text-sm font-semibold">Full name<input required className={`${inp} mt-1.5`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Mobile number<input required type="tel" className={`${inp} mt-1.5`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Email<input disabled className={`${inp} mt-1.5 bg-field text-ink/60`} value={f.email} /></label>
        <button className={btn}>Save details</button></form></Card>
      <Card><form onSubmit={change} className="space-y-4"><h2 className="text-lg">Change password</h2>
        <input type="password" required autoComplete="current-password" placeholder="Current password" className={inp} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (min 8 characters)" className={inp} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat new password" className={inp} value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} />
        <button className={btn}>Update password</button></form></Card></div></div>)
}
