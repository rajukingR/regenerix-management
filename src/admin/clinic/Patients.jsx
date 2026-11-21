import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { Alert, Card, DataTable, Detail, Icon, Loading, Modal, PageHead, Pager, Person, Pill, SearchBox, Select, Tabs, Toolbar, btn, btn2, btnDanger, fmtDate, fmtDateTime, inp, qs } from '../../portal/ui.jsx'
import { Balance, CONS_STATUS, Err, Field, MODES, PaymentForm, ReceiptActions, TREAT_STATUS, ageOf, rupee, todayStr } from './common.jsx'
import { ConsultationForm, ConsultationView } from './Consultations.jsx'
import { TreatmentForm, TreatmentView } from './Treatments.jsx'

// Patient register: every consultation, treatment and payment hangs off a patient file.
export default function Patients() {
  const nav = useNavigate()
  const [f, setF] = useState({ q: '', due: '' }); const [applied, setApplied] = useState(f); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [edit, setEdit] = useState(null)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/clinic/patients?${qs({ ...applied, page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, page])
  useEffect(() => { load() }, [load])
  const quick = (k) => (v) => { const n = { ...f, [k]: v }; setF(n); setApplied(n); setPage(1) }
  const cols = [
    { label: 'Patient', render: (p) => <Link to={`/admin/patients/${p.id}`} className="block hover:opacity-80"><Person name={p.name} sub={[ageOf(p), p.gender, p.city].filter(Boolean).join(' · ')} /></Link> },
    { label: 'File no', render: (p) => <span className="whitespace-nowrap font-mono text-xs">{p.file_no}</span> },
    { label: 'Contact', render: (p) => <span className="whitespace-nowrap">{p.phone || '—'}</span> },
    { label: 'Referred by', render: (p) => p.referred_by || '—' },
    { label: 'Balance', render: (p) => <Balance value={p.balance} /> },
    { label: 'Registered', render: (p) => <span className="whitespace-nowrap text-ink/70">{fmtDate(p.created_at)}</span> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (p) => <Link className={btn2} to={`/admin/patients/${p.id}`}><Icon name="eye" className="h-4 w-4" />Open</Link> },
  ]
  return (<div><PageHead title="Patients" sub="Register a patient once, then add consultations, treatments and payments to their file."><button className={btn} onClick={() => setEdit({})}><Icon name="plus" className="h-4 w-4" />Add patient</button></PageHead>
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      <Select label="Balance" value={f.due} onChange={quick('due')}><option value="">All patients</option><option value="1">With payment due</option><option value="advance">With advance</option></Select>
      <SearchBox value={f.q} onChange={(v) => setF({ ...f, q: v })} placeholder="Search name, phone, file no…" />
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={920} empty="No patients yet. Use “Add patient” to register the first one." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {edit && <PatientForm patient={edit} onClose={() => setEdit(null)} onSaved={(p) => { setEdit(null); nav(`/admin/patients/${p.id}`) }} />}
  </div>)
}

const FIELDS = ['name', 'guardian_name', 'gender', 'dob', 'age', 'phone', 'email', 'city', 'address', 'referred_by', 'remarks']
export function PatientForm({ patient, onClose, onSaved }) {
  const isNew = !patient.id
  const [f, setF] = useState(Object.fromEntries(FIELDS.map((k) => [k, patient[k] == null ? '' : k === 'dob' ? String(patient[k]).slice(0, 10) : patient[k]])))
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { onSaved((await api(`/admin/clinic/patients${isNew ? '' : `/${patient.id}`}`, { method: isNew ? 'POST' : 'PUT', body: f })).data) } catch (x) { setErr(x.message); setBusy(false) } }
  return (<Modal wide title={isNew ? 'Add patient' : `Edit ${patient.name}`} sub={isNew ? 'The file number is created automatically' : patient.file_no} onClose={onClose}><form onSubmit={save} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name *"><input required maxLength={120} className={inp} value={f.name} onChange={set('name')} /></Field>
      <Field label="Guardian name"><input maxLength={120} className={inp} value={f.guardian_name} onChange={set('guardian_name')} /></Field>
      <Field label="Contact number"><input type="tel" maxLength={17} className={inp} value={f.phone} onChange={set('phone')} /></Field>
      <Field label="Email"><input type="email" maxLength={190} className={inp} value={f.email} onChange={set('email')} /></Field>
      <Field label="Gender"><select className={inp} value={f.gender} onChange={set('gender')}><option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Date of birth"><input type="date" max={todayStr()} className={inp} value={f.dob} onChange={set('dob')} /></Field><Field label="or Age (years)"><input type="number" min="0" max="130" className={inp} value={f.age} onChange={set('age')} disabled={!!f.dob} /></Field></div>
      <Field label="City"><input maxLength={120} className={inp} value={f.city} onChange={set('city')} /></Field>
      <Field label="Referred by"><input maxLength={120} className={inp} value={f.referred_by} onChange={set('referred_by')} /></Field>
      <Field label="Address" className="sm:col-span-2"><textarea rows={2} className={inp} value={f.address} onChange={set('address')} /></Field>
      <Field label="Remarks" className="sm:col-span-2"><textarea rows={2} className={inp} value={f.remarks} onChange={set('remarks')} /></Field></div>
    <Err>{err}</Err>
    <div className="flex justify-end gap-2 pt-1"><button type="button" className={btn2} onClick={onClose}>Cancel</button><button className={btn} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Register patient' : 'Save'}</button></div></form></Modal>)
}

// One patient's file: details, balance, and their consultations / treatments / payments.
export function PatientView() {
  const { id } = useParams(); const nav = useNavigate()
  const [p, setP] = useState(null); const [err, setErr] = useState(''); const [tab, setTab] = useState('consultations'); const [open, setOpen] = useState(null)
  const load = useCallback(async () => { try { setP((await api(`/admin/clinic/patients/${id}`)).data); setErr('') } catch (e) { setErr(e.message) } }, [id])
  useEffect(() => { setP(null); load() }, [load])
  if (!p) return err ? <Alert onRetry={load}>{err}</Alert> : <Loading />
  const done = () => { setOpen(null); load() }
  const remove = async () => { if (window.confirm(`Delete ${p.name}'s file permanently? This cannot be undone.`)) { try { await api(`/admin/clinic/patients/${p.id}`, { method: 'DELETE' }); nav('/admin/patients') } catch (e) { setErr(e.message) } } }
  const delPay = async (y) => { if (window.confirm(`Delete receipt ${y.receipt_no} (${rupee(y.amount)})? This cannot be undone.`)) { try { await api(`/admin/clinic/payments/${y.id}`, { method: 'DELETE' }); load() } catch (e) { setErr(e.message) } } }
  const view = (k, row) => <button className={btn2} onClick={() => setOpen({ k, id: row.id })}><Icon name="eye" className="h-4 w-4" />View</button>
  const tables = {
    consultations: { rows: p.consultations, empty: 'No consultations yet.', cols: [
      { label: 'Case no', render: (c) => <span className="font-mono text-xs">{c.case_no}</span> }, { label: 'Visit date', render: (c) => <span className="whitespace-nowrap">{fmtDate(c.visit_date)}</span> }, { label: 'Doctor', render: (c) => c.doctor_name || '—' },
      { label: 'Fee', render: (c) => rupee(c.fee) }, { label: 'Due', render: (c) => <Balance value={c.due} /> }, { label: 'Status', render: (c) => <Pill s={c.status} map={CONS_STATUS} /> },
      { label: 'Action', className: 'text-right', head: 'text-right', render: (c) => view('cons', c) }] },
    treatments: { rows: p.treatments, empty: 'No treatments yet.', cols: [
      { label: 'Treatment no', render: (t) => <span className="font-mono text-xs">{t.treatment_no}</span> }, { label: 'Type', render: (t) => <span className="whitespace-nowrap capitalize">{t.service_type} · {t.package_type}</span> }, { label: 'Doctor', render: (t) => t.doctor_name || '—' },
      { label: 'Visits', render: (t) => (t.package_type === 'package' ? `${t.visits} / ${t.total_sessions}` : t.visits) }, { label: 'Due', render: (t) => <Balance value={t.due} /> }, { label: 'Status', render: (t) => <Pill s={t.status} map={TREAT_STATUS} /> },
      { label: 'Action', className: 'text-right', head: 'text-right', render: (t) => view('treat', t) }] },
    payments: { rows: p.payments, empty: 'No payments yet.', cols: [
      { label: 'Receipt no', render: (y) => <span className="font-mono text-xs">{y.receipt_no}</span> }, { label: 'Date', render: (y) => <span className="whitespace-nowrap">{fmtDate(y.paid_on)}</span> },
      { label: 'Towards', render: (y) => y.case_no || y.treatment_no || 'Advance' }, { label: 'Mode', render: (y) => MODES[y.mode] || y.mode }, { label: 'Amount', render: (y) => <b>{rupee(y.amount)}</b> }, { label: 'Discount', render: (y) => (y.discount ? rupee(y.discount) : '—') },
      { label: 'Action', className: 'text-right', head: 'text-right', render: (y) => <ReceiptActions y={y} notify={(m, bad) => (bad ? setErr(m) : window.alert(m))}><button className={btnDanger} onClick={() => delPay(y)}>Delete</button></ReceiptActions> }] },
  }
  const t = tables[tab]
  return (<div>
    <Link to="/admin/patients" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-teal-dark hover:underline"><Icon name="left" className="h-4 w-4" />All patients</Link>
    <PageHead title={p.name} sub={<><span className="font-mono">{p.file_no}</span>{[ageOf(p), p.gender, p.city].filter(Boolean).map((x) => <span key={x} className="capitalize"> · {x}</span>)}</>}>
      <button className={btn} onClick={() => setOpen({ k: 'newCons' })}><Icon name="plus" className="h-4 w-4" />Consultation</button>
      <button className={btn} onClick={() => setOpen({ k: 'newTreat' })}><Icon name="plus" className="h-4 w-4" />Treatment</button>
      <button className={btn2} onClick={() => setOpen({ k: 'pay' })}>Receive payment</button>
      <button className={btn2} onClick={() => setOpen({ k: 'edit' })}>Edit</button></PageHead>
    <Alert onRetry={load}>{err}</Alert>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card><Detail items={[['Contact', p.phone], ['Email', p.email], ['Date of birth', fmtDate(p.dob)], ['Guardian', p.guardian_name], ['Referred by', p.referred_by], ['Registered', fmtDateTime(p.created_at)], ['Address', p.address, true], ['Remarks', p.remarks, true]]} /></Card>
      <Card><h3 className="text-lg">Account</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-ink/60">Total charged</dt><dd>{rupee(p.charged)}</dd></div><div className="flex justify-between"><dt className="text-ink/60">Paid + discounts</dt><dd>{rupee(p.paid)}</dd></div>
        <div className="flex justify-between border-t border-ink/10 pt-2 text-base"><dt className="font-semibold">Balance</dt><dd><Balance value={p.balance} /></dd></div></dl>
        <button className={`${btnDanger} mt-5`} onClick={remove}>Delete patient file</button></Card></div>
    <div className="mt-6"><Tabs value={tab} onChange={setTab} items={[['consultations', 'Consultations', p.consultations.length], ['treatments', 'Treatments', p.treatments.length], ['payments', 'Payments', p.payments.length]]} />
      <DataTable columns={t.cols} rows={t.rows} minWidth={tab === 'payments' ? 1040 : 820} empty={t.empty} /></div>
    {open?.k === 'edit' && <PatientForm patient={p} onClose={() => setOpen(null)} onSaved={done} />}
    {open?.k === 'pay' && <PaymentForm preset={{ patient: p }} onClose={() => setOpen(null)} onSaved={done} />}
    {open?.k === 'newCons' && <ConsultationForm patient={p} onClose={() => setOpen(null)} onSaved={(c) => { load(); setOpen({ k: 'cons', id: c.id }) }} />}
    {open?.k === 'newTreat' && <TreatmentForm patient={p} onClose={() => setOpen(null)} onSaved={(x) => { load(); setOpen({ k: 'treat', id: x.id }) }} />}
    {open?.k === 'cons' && <ConsultationView id={open.id} onClose={() => setOpen(null)} onChanged={load} />}
    {open?.k === 'treat' && <TreatmentView id={open.id} onClose={() => setOpen(null)} onChanged={load} />}
  </div>)
}
