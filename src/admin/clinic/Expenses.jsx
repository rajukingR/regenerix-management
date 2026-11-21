import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Alert, DataTable, Icon, Modal, PageHead, Pager, SearchBox, Select, Toolbar, btn, btn2, btnDanger, fmtDate, inp, qs } from '../../portal/ui.jsx'
import { Err, Field, MODES, rupee, todayStr } from './common.jsx'

const CATEGORIES = ['Rent', 'Salary', 'Equipment', 'Consumables', 'Utilities', 'Maintenance', 'Marketing', 'Travel', 'Other']

// Clinic running costs. Reports subtract these from the money collected.
export default function Expenses() {
  const [f, setF] = useState({ q: '', category: '', date_from: '', date_to: '' }); const [applied, setApplied] = useState(f); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1, sum: 0, categories: [] }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [edit, setEdit] = useState(null)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/clinic/expenses?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const quick = (k) => (v) => { const n = { ...f, [k]: v }; setF(n); setApplied(n); setPage(1) }
  const del = async (x) => { if (window.confirm(`Delete the expense “${x.title}” (${rupee(x.amount)})? This cannot be undone.`)) { try { await api(`/admin/clinic/expenses/${x.id}`, { method: 'DELETE' }); load() } catch (e) { setErr(e.message) } } }
  const cats = [...new Set([...CATEGORIES, ...(res.categories || [])])]
  const cols = [
    { label: 'Date', render: (x) => <span className="whitespace-nowrap">{fmtDate(x.spent_on)}</span> },
    { label: 'Expense', render: (x) => <span><b className="font-medium">{x.title}</b>{x.note && <span className="block max-w-xs truncate text-xs text-ink/55">{x.note}</span>}</span> },
    { label: 'Category', render: (x) => x.category },
    { label: 'Paid to', render: (x) => x.paid_to || '—' },
    { label: 'Mode', render: (x) => MODES[x.mode] || x.mode },
    { label: 'Amount', render: (x) => <b>{rupee(x.amount)}</b> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (x) => <div className="flex justify-end gap-2"><button className={btn2} onClick={() => setEdit(x)}>Edit</button><button className={btnDanger} onClick={() => del(x)}>Delete</button></div> },
  ]
  return (<div><PageHead title="Expenses" sub="Track what the clinic spends so reports can show the real net figure."><button className={btn} onClick={() => setEdit({})}><Icon name="plus" className="h-4 w-4" />Add expense</button></PageHead>
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      <Select label="Category" value={f.category} onChange={quick('category')}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
      <label className="flex items-center gap-2 text-xs text-ink/60">From<input type="date" className={inp} value={f.date_from} onChange={(e) => set('date_from')(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-xs text-ink/60">To<input type="date" className={inp} value={f.date_to} onChange={(e) => set('date_to')(e.target.value)} /></label>
      <SearchBox value={f.q} onChange={set('q')} placeholder="Search expenses…" />
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    {res.total > 0 && <p className="mb-4 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm shadow-sm">Total for this view: <b>{rupee(res.sum)}</b> across {res.total} expense{res.total === 1 ? '' : 's'}</p>}
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={900} empty="No expenses recorded yet." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {edit && <ExpenseForm expense={edit} cats={cats} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
  </div>)
}

function ExpenseForm({ expense, cats, onClose, onSaved }) {
  const isNew = !expense.id
  const [f, setF] = useState({ spent_on: expense.spent_on ? String(expense.spent_on).slice(0, 10) : todayStr(), category: expense.category || 'Other', title: expense.title || '', amount: expense.amount != null ? String(expense.amount) : '', mode: expense.mode || 'cash', paid_to: expense.paid_to || '', note: expense.note || '' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  // "Paid to" is chosen from the active doctors and the admin accounts; "Someone else" allows a typed name (landlord, supplier…).
  const [people, setPeople] = useState(null); const [other, setOther] = useState(false)
  useEffect(() => { api('/admin/clinic/options').then((r) => { const p = { doctors: r.doctors || [], admins: r.admins || [] }; setPeople(p); if (expense.paid_to && ![...p.doctors, ...p.admins].some((x) => x.name === expense.paid_to)) setOther(true) }).catch(() => { setPeople({ doctors: [], admins: [] }); setOther(true) }) }, [expense.paid_to])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api(`/admin/clinic/expenses${isNew ? '' : `/${expense.id}`}`, { method: isNew ? 'POST' : 'PUT', body: f }); onSaved() } catch (x) { setErr(x.message); setBusy(false) } }
  return (<Modal title={isNew ? 'Add expense' : 'Edit expense'} onClose={onClose}><form onSubmit={save} className="space-y-4">
    <Field label="What was it for? *"><input required maxLength={190} className={inp} value={f.title} onChange={set('title')} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Amount (₹) *"><input type="number" min="0.01" step="0.01" required className={inp} value={f.amount} onChange={set('amount')} /></Field>
      <Field label="Date *"><input type="date" required max={todayStr()} className={inp} value={f.spent_on} onChange={set('spent_on')} /></Field>
      <Field label="Category"><select className={inp} value={f.category} onChange={set('category')}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Mode"><select className={inp} value={f.mode} onChange={set('mode')}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
    <Field label="Paid to"><select className={inp} disabled={!people} value={other ? '__other' : f.paid_to} onChange={(e) => { const v = e.target.value; setOther(v === '__other'); setF((x) => ({ ...x, paid_to: v === '__other' ? '' : v })) }}>
      <option value="">{people ? '— Select —' : 'Loading…'}</option>
      {people?.doctors.length > 0 && <optgroup label="Doctors">{people.doctors.map((d) => <option key={`d${d.id}`} value={d.name}>{d.name}{d.role ? ` · ${d.role}` : ''}</option>)}</optgroup>}
      {people?.admins.length > 0 && <optgroup label="Admin">{people.admins.map((a) => <option key={`a${a.id}`} value={a.name}>{a.name} (Admin)</option>)}</optgroup>}
      <option value="__other">Someone else (type the name)</option></select>
      {other && <input maxLength={120} autoFocus className={`${inp} mt-2`} placeholder="Name of the person or supplier" value={f.paid_to} onChange={set('paid_to')} />}</Field>
    <Field label="Note"><textarea rows={2} className={inp} value={f.note} onChange={set('note')} /></Field>
    <Err>{err}</Err>
    <div className="flex justify-end gap-2 pt-1"><button type="button" className={btn2} onClick={onClose}>Cancel</button><button className={btn} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form></Modal>)
}
