import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { Alert, DataTable, Detail, Icon, Loading, Modal, PageHead, Pager, Person, Pill, SearchBox, Tabs, Toolbar, btn, btn2, btnDanger, fmtDate, inp, qs } from '../../portal/ui.jsx'
import { Balance, CONS_STATUS, DoctorSelect, Err, Field, MODES, Ok, PatientPicker, PaymentForm, ageOf, printConsultation, printReceipt, rupee, todayStr, useDoctors } from './common.jsx'
import { TreatmentForm } from './Treatments.jsx'

const VIEWS = { all: {}, pending: { status: 'pending' }, due: { due: '1' } }

// Consultations: the first assessment visit. Record the fee and complaints up front, then the doctor's notes and prescription.
export default function Consultations() {
  const [sp, setSp] = useSearchParams(); const doctors = useDoctors()
  const [tab, setTab] = useState(VIEWS[sp.get('view')] ? sp.get('view') : 'all'); const [f, setF] = useState({ q: '', doctor_id: '', date_from: '', date_to: '' }); const [applied, setApplied] = useState(f); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(null)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/clinic/consultations?${qs({ ...applied, ...VIEWS[tab], page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, tab, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (sp.get('view')) setSp({}, { replace: true }) }, [sp, setSp])
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const cols = [
    { label: 'Patient', render: (c) => <Link to={`/admin/patients/${c.patient_id}`} className="block hover:opacity-80"><Person name={c.patient_name} sub={[c.file_no, c.patient_phone].filter(Boolean).join(' · ')} /></Link> },
    { label: 'Case no', render: (c) => <span className="whitespace-nowrap font-mono text-xs">{c.case_no}</span> },
    { label: 'Visit date', render: (c) => <span className="whitespace-nowrap">{fmtDate(c.visit_date)}</span> },
    { label: 'Doctor', render: (c) => c.doctor_name || <span className="text-ink/45">Not assigned</span> },
    { label: 'Fee', render: (c) => rupee(c.fee) },
    { label: 'Payment', render: (c) => <Balance value={c.due} /> },
    { label: 'Status', render: (c) => <Pill s={c.status} map={CONS_STATUS} /> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (c) => <button className={btn2} onClick={() => setOpen({ id: c.id })}><Icon name="eye" className="h-4 w-4" />View</button> },
  ]
  return (<div><PageHead title="Consultations" sub="Record each assessment visit, the doctor's findings and the prescription."><button className={btn} onClick={() => setOpen({ create: true })}><Icon name="plus" className="h-4 w-4" />New consultation</button></PageHead>
    <Tabs value={tab} onChange={(k) => { setTab(k); setPage(1) }} items={[['all', 'All'], ['pending', 'Pending'], ['due', 'Pending payment']]} />
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      <div className="sm:w-56"><DoctorSelect doctors={doctors} value={f.doctor_id} onChange={set('doctor_id')} blank="All doctors" /></div>
      <label className="flex items-center gap-2 text-xs text-ink/60">From<input type="date" className={inp} value={f.date_from} onChange={(e) => set('date_from')(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-xs text-ink/60">To<input type="date" className={inp} value={f.date_to} onChange={(e) => set('date_to')(e.target.value)} /></label>
      <SearchBox value={f.q} onChange={set('q')} placeholder="Search patient, case no…" />
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={1000} empty="No consultations found." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {open?.create && <ConsultationForm onClose={() => setOpen(null)} onSaved={(c) => { load(); setOpen({ id: c.id }) }} />}
    {open?.id && <ConsultationView id={open.id} onClose={() => setOpen(null)} onChanged={load} />}
  </div>)
}

export function ConsultationForm({ patient: preset, onClose, onSaved }) {
  const doctors = useDoctors(); const [patient, setPatient] = useState(preset || null)
  const [f, setF] = useState({ visit_date: todayStr(), doctor_id: '', fee: '', referred_by: preset?.referred_by || '', complaints: '', height_cm: '', weight_kg: '', allergies: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => { e.preventDefault(); if (!patient) { setErr('Choose a patient'); return } setBusy(true); setErr(''); try { onSaved((await api('/admin/clinic/consultations', { method: 'POST', body: { ...f, patient_id: patient.id } })).data) } catch (x) { setErr(x.message); setBusy(false) } }
  return (<Modal wide title="New consultation" sub="The case number is created automatically" onClose={onClose}><form onSubmit={save} className="space-y-4">
    <Field label="Patient *"><PatientPicker value={patient} onChange={(p) => { setPatient(p); if (p?.referred_by) setF((x) => ({ ...x, referred_by: x.referred_by || p.referred_by })) }} locked={!!preset} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Visit date *"><input type="date" required className={inp} value={f.visit_date} onChange={set('visit_date')} /></Field>
      <Field label="Consultation by"><DoctorSelect doctors={doctors} value={f.doctor_id} onChange={(v) => setF((x) => ({ ...x, doctor_id: v }))} /></Field>
      <Field label="Fee (₹)"><input type="number" min="0" step="0.01" className={inp} value={f.fee} onChange={set('fee')} placeholder="0" /></Field>
      <Field label="Referred by"><input maxLength={120} className={inp} value={f.referred_by} onChange={set('referred_by')} /></Field>
      <Field label="Height (cm)"><input maxLength={10} inputMode="decimal" className={inp} value={f.height_cm} onChange={set('height_cm')} /></Field>
      <Field label="Weight (kg)"><input maxLength={10} inputMode="decimal" className={inp} value={f.weight_kg} onChange={set('weight_kg')} /></Field>
      <Field label="Present complaints" className="sm:col-span-2"><textarea rows={3} className={inp} value={f.complaints} onChange={set('complaints')} /></Field>
      <Field label="Allergies or notes" className="sm:col-span-2"><textarea rows={2} className={inp} value={f.allergies} onChange={set('allergies')} /></Field></div>
    <Err>{err}</Err>
    <div className="flex justify-end gap-2 pt-1"><button type="button" className={btn2} onClick={onClose}>Cancel</button><button className={btn} disabled={busy || !patient}>{busy ? 'Saving…' : 'Create consultation'}</button></div></form></Modal>)
}

const NOTES = [['complaints', 'Present complaints'], ['examination', 'Examination'], ['diagnosis', 'Diagnosis'], ['investigation', 'Investigation'], ['advice', 'Advice'], ['prescription', 'Prescription / medication']]

export function ConsultationView({ id, onClose, onChanged }) {
  const doctors = useDoctors()
  const [c, setC] = useState(null); const [n, setN] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [sub, setSub] = useState(null)
  const fill = (x) => { setC(x); setN({ doctor_id: x.doctor_id || '', fee: String(x.fee), next_visit_date: x.next_visit_date ? String(x.next_visit_date).slice(0, 10) : '', ...Object.fromEntries(NOTES.map(([k]) => [k, x[k] || ''])) }) }
  const load = useCallback(async () => { try { fill((await api(`/admin/clinic/consultations/${id}`)).data); setErr('') } catch (e) { setErr(e.message) } }, [id])
  useEffect(() => { load() }, [load])
  const put = async (body, done) => { setBusy(true); setErr(''); setOk(''); try { await api(`/admin/clinic/consultations/${id}`, { method: 'PUT', body }); await load(); setOk(done); onChanged?.() } catch (e) { setErr(e.message) } setBusy(false) }
  const del = async () => { if (window.confirm('Delete this consultation permanently? This cannot be undone.')) { try { await api(`/admin/clinic/consultations/${id}`, { method: 'DELETE' }); onChanged?.(); onClose() } catch (e) { setErr(e.message) } } }
  if (!c) return <Modal wide title="Consultation" onClose={onClose}>{err ? <Err>{err}</Err> : <Loading />}</Modal>
  const p = c.patient || {}, locked = c.status === 'cancelled'
  return (<><Modal wide title={c.patient_name} sub={<span className="font-mono">{c.case_no}</span>} onClose={onClose}>
    <div className="flex flex-wrap items-center gap-3"><Pill s={c.status} map={CONS_STATUS} /><span className="text-sm text-ink/60">{fmtDate(c.visit_date)}</span><Balance value={c.due} /><Link to={`/admin/patients/${c.patient_id}`} className="ml-auto text-sm font-semibold text-teal-dark underline" onClick={onClose}>Open patient file</Link></div>
    <Detail items={[['File no', p.file_no], ['Contact', p.phone], ['Age / gender', [ageOf(p), p.gender].filter(Boolean).join(' · ')], ['Referred by', c.referred_by], ['Height / weight', [c.height_cm && `${c.height_cm} cm`, c.weight_kg && `${c.weight_kg} kg`].filter(Boolean).join(' / ')], ['Allergies / notes', c.allergies]]} />
    <section className="space-y-4 rounded-xl border border-teal/25 bg-mist/60 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon name="steth" className="h-4 w-4 text-teal-dark" />Doctor's notes</h3>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Consultation by"><DoctorSelect doctors={doctors} value={n.doctor_id} onChange={(v) => setN({ ...n, doctor_id: v })} /></Field>
        <Field label="Fee (₹)"><input type="number" min="0" step="0.01" className={inp} value={n.fee} onChange={(e) => setN({ ...n, fee: e.target.value })} disabled={locked} /></Field>
        <Field label="Next visit"><input type="date" className={inp} value={n.next_visit_date} onChange={(e) => setN({ ...n, next_visit_date: e.target.value })} /></Field></div>
      {NOTES.map(([k, label]) => <Field key={k} label={label}><textarea rows={k === 'prescription' ? 4 : 2} className={inp} value={n[k]} onChange={(e) => setN({ ...n, [k]: e.target.value })} /></Field>)}
      <div className="flex flex-wrap gap-2"><button className={btn} disabled={busy} onClick={() => put(n, 'Notes saved')}>Save notes</button>
        {c.status === 'pending' && <button className={btn2} disabled={busy} onClick={() => put({ ...n, status: 'completed' }, 'Marked completed')}><Icon name="check" className="h-4 w-4" />Save and mark completed</button>}
        {c.status !== 'pending' && <button className={btn2} disabled={busy} onClick={() => put({ status: 'pending' }, 'Reopened')}>Reopen</button>}</div></section>
    <Ok>{ok}</Ok><Err>{err}</Err>
    <div><h3 className="mb-2 text-sm font-semibold">Payments</h3>
      {c.payments.length ? <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 text-sm">{c.payments.map((y) => <li key={y.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2"><span className="font-mono text-xs">{y.receipt_no}</span><span>{fmtDate(y.paid_on)}</span><span>{MODES[y.mode] || y.mode}</span><b className="ml-auto">{rupee(y.amount)}</b>{y.discount > 0 && <span className="text-xs text-ink/55">+ {rupee(y.discount)} discount</span>}<button className="text-xs font-semibold text-teal-dark underline" onClick={() => printReceipt(y.id)}>Print</button></li>)}</ul>
        : <p className="text-sm text-ink/55">No payment recorded for this consultation.</p>}</div>
    <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
      {c.due > 0 && <button className={btn} onClick={() => setSub('pay')}>Receive payment</button>}
      <button className={btn2} onClick={() => setSub('treat')}><Icon name="plus" className="h-4 w-4" />Create treatment</button>
      <button className={btn2} onClick={() => printConsultation(c.id)}>Print</button>
      {!locked && <button className={btnDanger} disabled={busy} onClick={() => window.confirm('Cancel this consultation? Its fee will no longer be charged.') && put({ status: 'cancelled' }, 'Consultation cancelled')}>Cancel consultation</button>}
      <button className={`${btnDanger} sm:ml-auto`} onClick={del}>Delete</button></div>
  </Modal>
  {sub === 'pay' && <PaymentForm preset={{ patient: p, consultation_id: c.id }} onClose={() => setSub(null)} onSaved={() => { setSub(null); load(); onChanged?.() }} />}
  {sub === 'treat' && <TreatmentForm patient={p} preset={{ consultation_id: c.id, diagnosis: c.diagnosis || '', doctor_id: c.doctor_id || '', referred_by: c.referred_by || '' }} onClose={() => setSub(null)} onSaved={(t) => { setSub(null); setOk(`Treatment ${t.treatment_no} created. Find it under Treatments.`); onChanged?.() }} />}
  </>)
}
