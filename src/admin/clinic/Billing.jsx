import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { Alert, DataTable, Icon, PageHead, Pager, Person, SearchBox, Select, Tabs, Toolbar, btn, btnDanger, fmtDate, inp, qs } from '../../portal/ui.jsx'
import { Balance, MODES, PaymentForm, Ok, ReceiptActions, rupee } from './common.jsx'

// Billing: every payment received (each with a printable receipt) and the list of patients who still owe money.
export default function Billing() {
  const [sp, setSp] = useSearchParams()
  const [tab, setTab] = useState(sp.get('view') === 'dues' ? 'dues' : 'receipts'); const [f, setF] = useState({ q: '', mode: '', date_from: '', date_to: '' }); const [applied, setApplied] = useState(f); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [loading, setLoading] = useState(true); const [pay, setPay] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { setRes(await api(tab === 'dues' ? `/admin/clinic/dues?${qs({ q: applied.q, page, limit: 15 })}` : `/admin/clinic/payments?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [applied, tab, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (sp.get('view')) setSp({}, { replace: true }) }, [sp, setSp])
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const quick = (k) => (v) => { const n = { ...f, [k]: v }; setF(n); setApplied(n); setPage(1) }
  const del = async (y) => { if (window.confirm(`Delete receipt ${y.receipt_no} (${rupee(y.amount)} from ${y.patient_name})? This cannot be undone.`)) { try { await api(`/admin/clinic/payments/${y.id}`, { method: 'DELETE' }); setOk(''); load() } catch (e) { setErr(e.message) } } }
  const patientCell = (r, id) => <Link to={`/admin/patients/${id}`} className="block hover:opacity-80"><Person name={r.patient_name || r.name} sub={[r.file_no, r.patient_phone || r.phone].filter(Boolean).join(' · ')} /></Link>
  const receiptCols = [
    { label: 'Patient', render: (y) => patientCell(y, y.patient_id) },
    { label: 'Receipt no', render: (y) => <span className="whitespace-nowrap font-mono text-xs">{y.receipt_no}</span> },
    { label: 'Date', render: (y) => <span className="whitespace-nowrap">{fmtDate(y.paid_on)}</span> },
    { label: 'Towards', render: (y) => <span className="whitespace-nowrap">{y.case_no ? `Consultation ${y.case_no}` : y.treatment_no ? `Treatment ${y.treatment_no}` : 'Advance'}</span> },
    { label: 'Mode', render: (y) => MODES[y.mode] || y.mode },
    { label: 'Amount', render: (y) => <span className="whitespace-nowrap"><b>{rupee(y.amount)}</b>{y.discount > 0 && <span className="block text-xs text-ink/55">+ {rupee(y.discount)} discount</span>}</span> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (y) => <ReceiptActions y={y} notify={(m, bad) => { setOk(bad ? '' : m); setErr(bad ? m : '') }}><button className={btnDanger} onClick={() => del(y)}>Delete</button></ReceiptActions> },
  ]
  const dueCols = [
    { label: 'Patient', render: (p) => patientCell(p, p.id) },
    { label: 'Total charged', render: (p) => rupee(p.charged) },
    { label: 'Paid + discounts', render: (p) => rupee(p.paid) },
    { label: 'Balance', render: (p) => <Balance value={p.balance} /> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (p) => <button className={btn} onClick={() => setPay({ patient: p })}>Receive payment</button> },
  ]
  return (<div><PageHead title="Billing" sub="Receive payments, print receipts and follow up on dues."><button className={btn} onClick={() => setPay({})}><Icon name="plus" className="h-4 w-4" />Receive payment</button></PageHead>
    <Tabs value={tab} onChange={(k) => { setTab(k); setPage(1); setRes({ data: [], total: 0, pages: 1 }) }} items={[['receipts', 'Receipts'], ['dues', 'Payment dues']]} />
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      {tab === 'receipts' && (<><Select label="Mode" value={f.mode} onChange={quick('mode')}><option value="">All modes</option>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="flex items-center gap-2 text-xs text-ink/60">From<input type="date" className={inp} value={f.date_from} onChange={(e) => set('date_from')(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-xs text-ink/60">To<input type="date" className={inp} value={f.date_to} onChange={(e) => set('date_to')(e.target.value)} /></label></>)}
      <SearchBox value={f.q} onChange={set('q')} placeholder={tab === 'dues' ? 'Search patient…' : 'Search patient, receipt no…'} />
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    {tab === 'dues' && res.total_due != null && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Total outstanding across all patients: <b>{rupee(res.total_due)}</b></p>}
    <Ok>{ok}</Ok><Alert onRetry={load}>{err}</Alert>
    <DataTable columns={tab === 'dues' ? dueCols : receiptCols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={1120} empty={tab === 'dues' ? 'Nobody owes anything right now.' : 'No receipts found.'} />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {pay && <PaymentForm preset={pay} onClose={() => setPay(null)} onSaved={(y) => { setPay(null); setOk(`Payment saved. Receipt ${y.receipt_no} is in the Receipts tab.`); load() }} />}
  </div>)
}
