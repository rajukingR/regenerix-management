import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api.js'
import { Alert, DataTable, Icon, Modal, PageHead, Person, Pill, SearchBox, Toolbar, btn, btn2, btnDanger, inp } from '../portal/ui.jsx'

// Doctor logins: one per team member. A doctor sees only the appointments assigned to them.
export default function Doctors() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [q, setQ] = useState(''); const [edit, setEdit] = useState(null)
  const load = useCallback(async () => { setLoading(true); try { setRows((await api('/admin/doctors')).data); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [])
  useEffect(() => { load() }, [load])
  const toggle = async (r) => { try { await api(`/admin/doctors/${r.login.id}`, { method: 'PUT', body: { is_active: !r.login.is_active } }); load() } catch (e) { setErr(e.message) } }
  const shown = rows.filter((r) => !q || `${r.name} ${r.role} ${r.login?.email || ''}`.toLowerCase().includes(q.toLowerCase()))
  const cols = [
    { label: 'Doctor', render: (r) => <Person name={r.name} sub={r.role} src={r.image_url} /> },
    { label: 'Login email', render: (r) => r.login ? r.login.email : <span className="text-ink/45">No login</span> },
    { label: 'Open', render: (r) => <b>{r.appointments.open}</b> },
    { label: 'Completed', render: (r) => r.appointments.completed },
    { label: 'Status', render: (r) => r.login ? <Pill s={r.login.is_active ? 'active' : 'off'}>{r.login.is_active ? 'Active' : 'Disabled'}</Pill> : <Pill s="off">No login</Pill> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (r) => r.login
      ? <div className="flex justify-end gap-2"><button className={btn2} onClick={() => setEdit({ mode: 'edit', r })}>Edit</button><button className={r.login.is_active ? btnDanger : btn2} onClick={() => toggle(r)}>{r.login.is_active ? 'Disable' : 'Enable'}</button></div>
      : <button className={btn} onClick={() => setEdit({ mode: 'create', r })}><Icon name="key" className="h-4 w-4" />Create login</button> },
  ]
  return (<div><PageHead title="Doctors" sub={<>Give each team member a login so they can see and update the appointments you assign. Names and photos come from <Link to="/admin/team" className="font-medium text-teal-dark underline">Team</Link>.</>} />
    <Toolbar><SearchBox value={q} onChange={setQ} placeholder="Search doctors…" /><Link to="/admin/team" className={btn}><Icon name="plus" className="h-4 w-4" />Add team member</Link></Toolbar>
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={shown.map((r) => ({ ...r, id: r.team_id }))} loading={loading} minWidth={860} empty="No team members yet. Add doctors on the Team page first." />
    <p className="mt-4 text-xs text-ink/55">Doctors sign in at <b>/doctor/login</b> (or the normal admin login page) with the email and password you set here.</p>
    {edit && <LoginForm {...edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
  </div>)
}

function LoginForm({ mode, r, onClose, onSaved }) {
  const [f, setF] = useState({ email: r.login?.email || '', phone: r.login?.phone || '', password: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const gen = () => setF({ ...f, password: Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('') })
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      if (mode === 'create') await api('/admin/doctors', { method: 'POST', body: { team_id: r.team_id, ...f } })
      else await api(`/admin/doctors/${r.login.id}`, { method: 'PUT', body: { email: f.email, phone: f.phone, ...(f.password ? { password: f.password } : {}) } })
      onSaved()
    } catch (x) { setErr(x.message); setBusy(false) }
  }
  const remove = async () => { if (window.confirm(`Remove ${r.name}'s login? Their appointment history stays.`)) { try { await api(`/admin/doctors/${r.login.id}`, { method: 'DELETE' }); onSaved() } catch (x) { setErr(x.message) } } }
  return (<Modal title={mode === 'create' ? `Create login for ${r.name}` : `Edit ${r.name}'s login`} onClose={onClose}><form onSubmit={save} className="space-y-4">
    <label className="block text-sm font-semibold">Login email<input type="email" required className={`${inp} mt-1.5`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
    <label className="block text-sm font-semibold">Phone (optional)<input className={`${inp} mt-1.5`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
    <label className="block text-sm font-semibold">{mode === 'create' ? 'Password' : 'New password (leave blank to keep)'}<span className="mt-1.5 flex gap-2"><input type="text" required={mode === 'create'} minLength={8} autoComplete="new-password" className={inp} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="At least 8 characters" /><button type="button" className={`${btn2} shrink-0`} onClick={gen}>Generate</button></span></label>
    <p className="text-xs text-ink/55">Share the email and password with the doctor. They can change the password after signing in.</p>
    {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    <div className="flex flex-wrap gap-2 pt-1">{mode === 'edit' && <button type="button" className={`${btnDanger} mr-auto`} onClick={remove}>Remove login</button>}<button type="button" className={btn2} onClick={onClose}>Cancel</button><button className={btn} disabled={busy}>{busy ? 'Saving…' : mode === 'create' ? 'Create login' : 'Save'}</button></div></form></Modal>)
}
