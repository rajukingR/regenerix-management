import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, openResume } from './api.js'
import { Alert, DataTable, Detail, Icon, Modal, PageHead, Pager, Person, Pill, SearchBox, Select, Toolbar, btn, btn2, btnDanger, fmtDate, fmtDateTime, inp, qs } from '../portal/ui.jsx'

// Admin wording. Members see the friendlier labels from portal/ui.jsx (APP_STATUS).
const STATUS = { new: 'New', under_review: 'Under review', shortlisted: 'Shortlisted', interview: 'Interview scheduled', selected: 'Selected', rejected: 'Rejected' }
const F0 = { q: '', job_id: '', status: '', date_from: '', date_to: '' }

export default function Applications() {
  const [sp, setSp] = useSearchParams(); const init = { ...F0, status: sp.get('status') || '' }
  const [f, setF] = useState(init); const [applied, setApplied] = useState(init); const [page, setPage] = useState(1); const [more, setMore] = useState(false)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [jobs, setJobs] = useState([]); const [sel, setSel] = useState(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/applications?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { api('/admin/jobs').then(setJobs).catch(() => {}) }, [])
  const view = useCallback(async (id) => { try { setSel((await api(`/admin/applications/${id}`)).data) } catch (e) { setErr(e.message) } }, [])
  useEffect(() => { const id = sp.get('open'); if (id) { view(id); setSp({}, { replace: true }) } else if (sp.get('status')) setSp({}, { replace: true }) }, [sp, setSp, view]) // opened from a notification
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const quick = (k) => (v) => { const n = { ...f, [k]: v }; setF(n); setApplied(n); setPage(1) }

  const cols = [
    { label: 'Full Name', render: (a) => <Person name={a.name} sub={a.email} /> },
    { label: 'Job', render: (a) => a.job_title || <span className="text-ink/45">General</span> },
    { label: 'Mobile No', render: (a) => <span className="whitespace-nowrap">{a.phone}</span> },
    { label: 'Experience', render: (a) => a.experience ? `${a.experience} yrs` : '—' },
    { label: 'Applied', render: (a) => <span className="whitespace-nowrap">{fmtDate(a.created_at)}</span> },
    { label: 'Resume', render: (a) => a.has_resume ? <button className={btn2} onClick={() => openResume(a.id)}><Icon name="file" className="h-4 w-4" />Open</button> : '—' },
    { label: 'Status', render: (a) => <span className="flex items-center gap-1.5"><Pill s={a.status} map={STATUS} />{a.member_id ? <span title="Has a member account — gets notified" className="text-teal-dark"><Icon name="bell" className="h-4 w-4" /></span> : null}</span> },
    { label: 'Action', render: (a) => <button className={btn2} onClick={() => view(a.id)}><Icon name="eye" className="h-4 w-4" />Review</button>, className: 'text-right', head: 'text-right' },
  ]
  return (<div><PageHead title="Job Applications" sub="Review each resume and set its status. Applicants with a member account are notified automatically." />
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center"><span className="text-sm font-semibold text-ink/70">Job:</span>
      <Select label="Job" value={f.job_id} onChange={quick('job_id')} className="sm:w-72"><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select></div>
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      <Select label="Status" value={f.status} onChange={quick('status')}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      <SearchBox value={f.q} onChange={set('q')} placeholder="Search name or email…" />
      <button type="button" className={btn2} onClick={() => setMore(!more)}><Icon name="calendar" className="h-4 w-4" />Dates</button>
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    {more && (<div className="mb-5 grid gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-sm sm:grid-cols-3">
      <label className="text-xs text-ink/60">Applied from<input type="date" className={inp} value={f.date_from} onChange={(e) => set('date_from')(e.target.value)} /></label>
      <label className="text-xs text-ink/60">Applied to<input type="date" className={inp} value={f.date_to} onChange={(e) => set('date_to')(e.target.value)} /></label>
      <div className="flex items-end gap-2"><button type="button" className={btn} onClick={() => { setPage(1); setApplied(f) }}>Apply</button><button type="button" className={btn2} onClick={() => { setF(F0); setApplied(F0); setPage(1) }}>Reset</button></div></div>)}
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={1000} empty="No applications found." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {sel && <Review a={sel} onClose={() => setSel(null)} onChanged={(x) => { if (x) setSel(x); else setSel(null); load() }} />}
  </div>)
}

function Review({ a, onClose, onChanged }) {
  const [status, setStatus] = useState(a.status); const [note, setNote] = useState(a.status_note || ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const save = async () => {
    setBusy(true); setErr(''); setOk('')
    try { const r = await api(`/admin/applications/${a.id}`, { method: 'PUT', body: { status, note } }); setOk(r.notified ? 'Saved. The applicant has been notified.' : a.member_id ? 'Saved.' : 'Saved. (No member account — the applicant was not notified.)'); onChanged({ ...a, status, status_note: note }) } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const del = async () => { if (window.confirm('Delete this application and its resume permanently?')) { try { await api(`/admin/applications/${a.id}`, { method: 'DELETE' }); onChanged(null) } catch (e) { setErr(e.message) } } }
  return (<Modal wide title={a.name} sub={a.job_title || 'General application'} onClose={onClose}
    footer={<><button className={`${btnDanger} mr-auto`} onClick={del}>Delete</button><button className={btn2} onClick={onClose}>Close</button><button className={btn} disabled={busy || (status === a.status && note === (a.status_note || ''))} onClick={save}>{busy ? 'Saving…' : 'Save status'}</button></>}>
    <div className="flex flex-wrap items-center gap-3"><Pill s={a.status} map={STATUS} />{a.member_id ? <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-ink/70">Member account · gets notified</span> : <span className="text-xs text-ink/50">No member account</span>}</div>
    <Detail items={[['Email', a.email], ['Mobile', a.phone], ['Experience', a.experience], ['Applied', fmtDateTime(a.created_at)], ['Cover letter', a.cover_letter, true]]} />
    {a.has_resume && <button className={btn2} onClick={() => openResume(a.id)}><Icon name="file" className="h-4 w-4" />Open / download resume{a.resume_name ? ` (${a.resume_name})` : ''}</button>}
    <section className="rounded-xl border border-teal/25 bg-mist/60 p-4"><h3 className="text-sm font-semibold">Resume decision</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(STATUS).map(([k, v]) => <button key={k} type="button" onClick={() => setStatus(k)} aria-pressed={status === k} className={`rounded-lg border px-3 py-2 text-sm transition ${status === k ? (k === 'rejected' ? 'border-red-600 bg-red-600 text-white' : 'border-teal bg-teal text-white') : 'border-ink/15 bg-white hover:border-teal/50'}`}>{v}</button>)}</div>
      <label className="mt-3 block text-xs font-medium text-ink/60">Message to the applicant (optional — shown in their dashboard)<textarea rows={2} className={`${inp} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={status === 'interview' ? 'e.g. Interview on 12 Nov at 11 AM at the Electronic City clinic' : ''} /></label></section>
    {ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>}
    {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
  </Modal>)
}
