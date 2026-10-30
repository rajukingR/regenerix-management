import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api.js'
import { RESOURCES } from './resources.js'
import { Alert, Card, Icon, Loading, StatCard } from '../portal/ui.jsx'

export default function Dashboard() {
  const [d, setD] = useState(null); const [me, setMe] = useState(null); const [err, setErr] = useState('')
  const load = () => Promise.all([api('/admin/dashboard'), api('/auth/me')]).then(([x, m]) => { setD(x); setMe(m); setErr('') }).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  if (!d) return err ? <Alert onRetry={load}>{err}</Alert> : <Loading />
  const p = d.portal || {}
  return (<div>
    <h2 className="mb-5 text-2xl font-bold text-ink md:text-[26px]">Welcome back, {me?.name || 'Admin'}!</h2>
    {p.unassigned > 0 && <Link to="/admin/appointments?assigned_to=none" className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Icon name="steth" className="h-5 w-5 shrink-0" /><span className="flex-1"><b>{p.unassigned}</b> open appointment{p.unassigned === 1 ? ' has' : 's have'} no doctor assigned yet.</span><Icon name="right" className="h-4 w-4" /></Link>}
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      <StatCard label="Total Appointments" value={p.appointments_total} icon="calendar" to="/admin/appointments" />
      <StatCard label="Pending Appointments" value={d.inbox.appointments} icon="clock" to="/admin/appointments?status=pending" />
      <StatCard label="Completed" value={p.completed} icon="checkCircle" to="/admin/appointments?status=completed" />
      <StatCard label="Rejected by Doctors" value={p.rejected} icon="xCircle" to="/admin/appointments?status=rejected" />
      <StatCard label="Job Applications" value={p.applications_total} icon="file" to="/admin/applications" />
      <StatCard label="New Applications" value={d.inbox.applications} icon="alert" to="/admin/applications?status=new" />
      <StatCard label="Doctors with Login" value={p.doctors} icon="steth" to="/admin/doctors" />
      <StatCard label="Registered Members" value={p.members} icon="users" to="/admin/members" />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <Card><h3 className="text-lg">Inbox</h3><ul className="mt-3 divide-y divide-ink/10 text-sm">{[['/admin/inbox/messages', 'New messages', d.inbox.messages, 'mail'], ['/admin/inbox/subscribers', 'Subscribers', d.inbox.subscribers, 'inbox'], ['/admin/media', 'Media files', d.media, 'image'], ['/admin/applications?status=shortlisted', 'Shortlisted candidates', p.shortlisted, 'userCheck']].map(([to, l, n, ic]) => (
        <li key={to}><Link to={to} className="flex items-center gap-3 py-3 hover:text-teal-dark"><span className="grid h-9 w-9 place-items-center rounded-lg bg-teal/10 text-teal-dark"><Icon name={ic} className="h-[18px] w-[18px]" /></span><span className="flex-1">{l}</span><b className="text-lg">{n ?? 0}</b></Link></li>))}</ul></Card>
      <Card><h3 className="text-lg">Website content</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(d.content).map(([k, v]) => (
        <Link key={k} to={`/admin/${k}`} className="rounded-lg border border-ink/10 p-3 transition hover:border-teal/40 hover:bg-mist"><p className="text-xs text-ink/55">{RESOURCES[k]?.title || k}</p><p className="mt-1 text-2xl font-bold">{v.total}</p><p className="text-[11px] text-ink/45">{v.active} active · {v.total - v.active} hidden</p></Link>))}</div></Card>
    </div></div>)
}
