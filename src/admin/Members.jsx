import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import { Alert, DataTable, Icon, PageHead, Pager, Person, Pill, SearchBox, Toolbar, btn, btn2, btnDanger, fmtDate, fmtDateTime, qs } from '../portal/ui.jsx'

// People who created an account on the website to follow their appointments and job applications.
export default function Members() {
  const [q, setQ] = useState(''); const [applied, setApplied] = useState(''); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/members?${qs({ q: applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  const toggle = async (m) => { if (m.is_active && !window.confirm(`Disable ${m.name}'s account? They will not be able to log in.`)) return; try { await api(`/admin/members/${m.id}/toggle`, { method: 'PATCH' }); load() } catch (e) { setErr(e.message) } }
  const cols = [
    { label: 'Full Name', render: (m) => <Person name={m.name} sub={m.email} /> },
    { label: 'Mobile No', render: (m) => <span className="whitespace-nowrap">{m.phone}</span> },
    { label: 'Appointments', render: (m) => m.appointments },
    { label: 'Applications', render: (m) => m.applications },
    { label: 'Joined', render: (m) => <span className="whitespace-nowrap">{fmtDate(m.created_at)}</span> },
    { label: 'Last login', render: (m) => <span className="whitespace-nowrap text-xs text-ink/60">{m.last_login_at ? fmtDateTime(m.last_login_at) : '—'}</span> },
    { label: 'Status', render: (m) => <Pill s={m.is_active ? 'active' : 'off'}>{m.is_active ? 'Active' : 'Disabled'}</Pill> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (m) => <button className={m.is_active ? btnDanger : btn2} onClick={() => toggle(m)}>{m.is_active ? 'Disable' : 'Enable'}</button> },
  ]
  return (<div><PageHead title="Members List" sub="Patients and job applicants with a website account. They get notified when you update their appointment or application." />
    <Toolbar onSubmit={() => { setPage(1); setApplied(q) }}><SearchBox value={q} onChange={setQ} placeholder="Search name, email, phone…" /><button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={980} empty="No members have registered yet." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
  </div>)
}
