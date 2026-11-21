import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { Alert, DataTable, Detail, Icon, Loading, Modal, PageHead, Pager, Person, Pill, SearchBox, Select, Tabs, Toolbar, btn, btn2, btnDanger, fmtDate, inp, qs } from '../../portal/ui.jsx'
import { Balance, DoctorSelect, Err, Field, MODES, Ok, PKG, PatientPicker, PaymentForm, TREAT_STATUS, printReceipt, rupee, todayStr, useDoctors } from './common.jsx'

const VIEWS = { active: { status: 'active' }, all: {}, due: { due: '1' }, home: { status: 'active', service_type: 'home' } }

// Treatments: the ongoing therapy plan. Each session is logged as a visit entry; regular and procedure plans are charged per visit, packages have one fixed price.
export default function Treatments() {
  const [sp, setSp] = useSearchParams(); const doctors = useDoctors()
  const [tab, setTab] = useState(VIEWS[sp.get('view')] ? sp.get('view') : 'active'); const [f, setF] = useState({ q: '', doctor_id: '', package_type: '' }); const [applied, setApplied] = useState(f); const [page, setPage] = useState(1)
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 }); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(null)
  const load = useCallback(async () => { setLoading(true); try { setRes(await api(`/admin/clinic/treatments?${qs({ ...applied, ...VIEWS[tab], page, limit: 15 })}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied, tab, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (sp.get('view')) setSp({}, { replace: true }) }, [sp, setSp])
  const quick = (k) => (v) => { const n = { ...f, [k]: v }; setF(n); setApplied(n); setPage(1) }
  const cols = [
    { label: 'Patient', render: (t) => <Link to={`/admin/patients/${t.patient_id}`} className="block hover:opacity-80"><Person name={t.patient_name} sub={[t.file_no, t.patient_phone].filter(Boolean).join(' · ')} /></Link> },
    { label: 'Treatment no', render: (t) => <span className="whitespace-nowrap font-mono text-xs">{t.treatment_no}</span> },
    { label: 'Type', render: (t) => <span className="whitespace-nowrap capitalize">{t.service_type}<span className="block text-xs text-ink/55">{t.package_type}</span></span> },
    { label: 'Doctor', render: (t) => t.doctor_name || <span className="text-ink/45">Not assigned</span> },
    { label: 'Visits', render: (t) => (t.package_type === 'package' ? <span className="whitespace-nowrap">{t.visits} / {t.total_sessions}<span className="block text-xs text-ink/55">{t.remaining} left</span></span> : t.visits) },
    { label: 'Last visit', render: (t) => <span className="whitespace-nowrap">{fmtDate(t.last_visit) || '—'}</span> },
    { label: 'Payment', render: (t) => <Balance value={t.due} /> },
    { label: 'Status', render: (t) => <Pill s={t.status} map={TREAT_STATUS} /> },
    { label: 'Action', className: 'text-right', head: 'text-right', render: (t) => <button className={btn2} onClick={() => setOpen({ id: t.id })}><Icon name="eye" className="h-4 w-4" />View</button> },
  ]
  return (<div><PageHead title="Treatments" sub="Create a treatment plan, then add a visit entry each time the patient attends."><button className={btn} onClick={() => setOpen({ create: true })}><Icon name="plus" className="h-4 w-4" />New treatment</button></PageHead>
    <Tabs value={tab} onChange={(k) => { setTab(k); setPage(1) }} items={[['active', 'Active'], ['all', 'All'], ['due', 'Pending payment'], ['home', 'Active home visits']]} />
    <Toolbar onSubmit={() => { setPage(1); setApplied(f) }}>
      <div className="sm:w-56"><DoctorSelect doctors={doctors} value={f.doctor_id} onChange={quick('doctor_id')} blank="All doctors" /></div>
      <Select label="Plan type" value={f.package_type} onChange={quick('package_type')}><option value="">All plan types</option>{Object.entries(PKG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      <SearchBox value={f.q} onChange={(v) => setF({ ...f, q: v })} placeholder="Search patient, treatment no…" />
      <button className={btn}><Icon name="search" className="h-4 w-4" />Search</button></Toolbar>
    <Alert onRetry={load}>{err}</Alert>
    <DataTable columns={cols} rows={res.data} start={(page - 1) * 15} loading={loading} minWidth={1100} empty="No treatments found." />
    <Pager page={page} pages={res.pages} total={res.total} onPage={setPage} />
    {open?.create && <TreatmentForm onClose={() => setOpen(null)} onSaved={(t) => { load(); setOpen({ id: t.id }) }} />}
    {open?.id && <TreatmentView id={open.id} onClose={() => setOpen(null)} onChanged={load} />}
  </div>)
}

const Choice = ({ value, onChange, options, name }) => (<div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>{options.map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={value === k} onClick={() => onChange(k)} className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${value === k ? 'border-teal bg-teal text-white' : 'border-ink/15 bg-white text-ink hover:bg-mist'}`}>{l}</button>)}</div>)

export function TreatmentForm({ patient: presetPatient, preset = {}, onClose, onSaved }) {
  const doctors = useDoctors(); const [patient, setPatient] = useState(presetPatient || null)
  const [f, setF] = useState({ start_date: todayStr(), doctor_id: preset.doctor_id || '', diagnosis: preset.diagnosis || '', details: '', service_type: 'clinic', package_type: 'regular', session_fee: '', total_sessions: '', package_price: '', referred_by: preset.referred_by || '', remarks: '', next_visit_date: '' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value })); const pick = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const save = async (e) => { e.preventDefault(); if (!patient) { setErr('Choose a patient'); return } setBusy(true); setErr(''); try { onSaved((await api('/admin/clinic/treatments', { method: 'POST', body: { ...f, patient_id: patient.id, consultation_id: preset.consultation_id } })).data) } catch (x) { setErr(x.message); setBusy(false) } }
  const pkg = f.package_type === 'package'
  return (<Modal wide title="New treatment" sub="The treatment number is created automatically" onClose={onClose}><form onSubmit={save} className="space-y-4">
    <Field label="Patient *"><PatientPicker value={patient} onChange={setPatient} locked={!!presetPatient} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Start date *"><input type="date" required className={inp} value={f.start_date} onChange={set('start_date')} /></Field>
      <Field label="Assigned to"><DoctorSelect doctors={doctors} value={f.doctor_id} onChange={pick('doctor_id')} /></Field>
      <Field label="Diagnosis" className="sm:col-span-2"><textarea rows={2} className={inp} value={f.diagnosis} onChange={set('diagnosis')} /></Field>
      <Field label="Treatment details *" className="sm:col-span-2"><textarea rows={3} required className={inp} value={f.details} onChange={set('details')} placeholder="What will be done in each session" /></Field>
      <div className="text-sm font-semibold">Service type<div className="mt-1.5"><Choice name="Service type" value={f.service_type} onChange={pick('service_type')} options={[['clinic', 'Clinic'], ['home', 'Home visit']]} /></div></div>
      <div className="text-sm font-semibold">Plan type<div className="mt-1.5"><Choice name="Plan type" value={f.package_type} onChange={pick('package_type')} options={[['regular', 'Regular'], ['package', 'Package'], ['procedure', 'Procedure']]} /></div></div>
      {pkg ? (<><Field label="Number of sessions *"><input type="number" min="1" max="999" required className={inp} value={f.total_sessions} onChange={set('total_sessions')} /></Field>
        <Field label="Package price (₹) *" hint="Charged once for the whole package"><input type="number" min="1" step="0.01" required className={inp} value={f.package_price} onChange={set('package_price')} /></Field></>)
        : <Field label="Charge per session (₹)" hint="Used as the default amount for each visit entry"><input type="number" min="0" step="0.01" className={inp} value={f.session_fee} onChange={set('session_fee')} placeholder="0" /></Field>}
      <Field label="Next visit date"><input type="date" className={inp} value={f.next_visit_date} onChange={set('next_visit_date')} /></Field>
      <Field label="Referred by"><input maxLength={120} className={inp} value={f.referred_by} onChange={set('referred_by')} /></Field>
      <Field label="Remarks" className="sm:col-span-2"><textarea rows={2} className={inp} value={f.remarks} onChange={set('remarks')} /></Field></div>
    <Err>{err}</Err>
    <div className="flex justify-end gap-2 pt-1"><button type="button" className={btn2} onClick={onClose}>Cancel</button><button className={btn} disabled={busy || !patient}>{busy ? 'Saving…' : 'Create treatment'}</button></div></form></Modal>)
}

export function TreatmentView({ id, onClose, onChanged }) {
  const doctors = useDoctors()
  const [t, setT] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [pay, setPay] = useState(false)
  const blank = (x) => ({ visit_date: todayStr(), amount: x && x.package_type !== 'package' ? String(x.session_fee) : '', paid: '', mode: 'cash', notes: '', doctor_id: x?.doctor_id || '' })
  const [v, setV] = useState(blank())
  const load = useCallback(async (reset) => { try { const x = (await api(`/admin/clinic/treatments/${id}`)).data; setT(x); if (reset) setV(blank(x)); setErr('') } catch (e) { setErr(e.message) } }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(true) }, [load])
  const run = async (fn, done) => { setBusy(true); setErr(''); setOk(''); try { await fn(); await load(true); setOk(done); onChanged?.() } catch (e) { setErr(e.message) } setBusy(false) }
  const put = (body, done) => run(() => api(`/admin/clinic/treatments/${id}`, { method: 'PUT', body }), done)
  const addVisit = (e) => { e.preventDefault(); run(() => api(`/admin/clinic/treatments/${id}/visits`, { method: 'POST', body: v }), 'Visit added') }
  const delVisit = (x) => window.confirm(`Delete the visit on ${fmtDate(x.visit_date)}? Its charge is removed; any payment stays on the account.`) && run(() => api(`/admin/clinic/treatments/${id}/visits/${x.id}`, { method: 'DELETE' }), 'Visit deleted')
  const del = async () => { if (window.confirm('Delete this treatment and all its visit entries permanently? This cannot be undone.')) { try { await api(`/admin/clinic/treatments/${id}`, { method: 'DELETE' }); onChanged?.(); onClose() } catch (e) { setErr(e.message) } } }
  if (!t) return <Modal wide title="Treatment" onClose={onClose}>{err ? <Err>{err}</Err> : <Loading />}</Modal>
  const p = t.patient || {}, pkg = t.package_type === 'package', active = t.status === 'active', full = pkg && t.remaining === 0
  return (<><Modal wide title={t.patient_name} sub={<span className="font-mono">{t.treatment_no}</span>} onClose={onClose}>
    <div className="flex flex-wrap items-center gap-3"><Pill s={t.status} map={TREAT_STATUS} /><span className="text-sm capitalize text-ink/60">{t.service_type} · {t.package_type}</span><Balance value={t.due} /><Link to={`/admin/patients/${t.patient_id}`} className="ml-auto text-sm font-semibold text-teal-dark underline" onClick={onClose}>Open patient file</Link></div>
    <Detail items={[['File no', p.file_no], ['Contact', p.phone], ['Started', fmtDate(t.start_date)], ['Next visit', fmtDate(t.next_visit_date)], ['Referred by', t.referred_by],
      pkg ? ['Package', `${t.visits} of ${t.total_sessions} sessions used · ${rupee(t.package_price)}`] : ['Charge per session', rupee(t.session_fee)],
      ['Total charged', rupee(t.charged)], ['Paid + discounts', rupee(t.paid)], ['Diagnosis', t.diagnosis, true], ['Treatment details', t.details, true], ['Remarks', t.remarks, true]]} />
    <Field label="Assigned to"><span className="flex gap-2"><DoctorSelect doctors={doctors} value={t.doctor_id} onChange={(d) => put({ doctor_id: d }, 'Doctor updated')} /></span></Field>

    {active && (<form onSubmit={addVisit} className="space-y-3 rounded-xl border border-teal/25 bg-mist/60 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon name="plus" className="h-4 w-4 text-teal-dark" />Add visit entry</h3>
      {full ? <p className="text-sm text-ink/70">All {t.total_sessions} sessions in this package have been used. Mark the treatment completed, or create a new one.</p> : (<>
        <div className="grid gap-3 sm:grid-cols-4"><Field label="Visit date"><input type="date" required max={todayStr()} className={inp} value={v.visit_date} onChange={(e) => setV({ ...v, visit_date: e.target.value })} /></Field>
          {!pkg && <Field label="Charge (₹)"><input type="number" min="0" step="0.01" className={inp} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>}
          <Field label="Paid now (₹)"><input type="number" min="0" step="0.01" className={inp} value={v.paid} onChange={(e) => setV({ ...v, paid: e.target.value })} placeholder="0" /></Field>
          <Field label="Mode"><select className={inp} value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })}>{Object.entries(MODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]"><Field label="Seen by"><DoctorSelect doctors={doctors} value={v.doctor_id} onChange={(d) => setV({ ...v, doctor_id: d })} /></Field>
          <Field label="Session notes"><input className={inp} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
        <button className={btn} disabled={busy}>{busy ? 'Saving…' : 'Add visit'}</button></>)}</form>)}
    <Ok>{ok}</Ok><Err>{err}</Err>

    <div><h3 className="mb-2 text-sm font-semibold">Visit history ({t.visit_list.length})</h3>
      {t.visit_list.length ? <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 text-sm">{t.visit_list.map((x, i) => <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2"><span className="w-8 text-ink/50">#{t.visit_list.length - i}</span><span className="whitespace-nowrap">{fmtDate(x.visit_date)}</span><span className="text-ink/70">{x.doctor_name || '—'}</span>{x.notes && <span className="min-w-0 flex-1 truncate text-ink/60">{x.notes}</span>}<b className="ml-auto">{pkg ? 'Package' : rupee(x.amount)}</b><button className="text-xs font-semibold text-red-700 underline" onClick={() => delVisit(x)}>Delete</button></li>)}</ul>
        : <p className="text-sm text-ink/55">No visits recorded yet.</p>}</div>
    <div><h3 className="mb-2 text-sm font-semibold">Payments</h3>
      {t.payments.length ? <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 text-sm">{t.payments.map((y) => <li key={y.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2"><span className="font-mono text-xs">{y.receipt_no}</span><span>{fmtDate(y.paid_on)}</span><span>{MODES[y.mode] || y.mode}</span><b className="ml-auto">{rupee(y.amount)}</b>{y.discount > 0 && <span className="text-xs text-ink/55">+ {rupee(y.discount)} discount</span>}<button className="text-xs font-semibold text-teal-dark underline" onClick={() => printReceipt(y.id)}>Print</button></li>)}</ul>
        : <p className="text-sm text-ink/55">No payment recorded for this treatment.</p>}</div>
    <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
      {t.due > 0 && <button className={btn} onClick={() => setPay(true)}>Receive payment</button>}
      {active ? <button className={btn2} disabled={busy} onClick={() => put({ status: 'completed' }, 'Marked completed')}><Icon name="check" className="h-4 w-4" />Mark completed</button> : <button className={btn2} disabled={busy} onClick={() => put({ status: 'active' }, 'Reopened')}>Reopen</button>}
      {active && <button className={btnDanger} disabled={busy} onClick={() => window.confirm('Cancel this treatment? No more visits can be added.') && put({ status: 'cancelled' }, 'Treatment cancelled')}>Cancel treatment</button>}
      <button className={`${btnDanger} sm:ml-auto`} onClick={del}>Delete</button></div>
  </Modal>
  {pay && <PaymentForm preset={{ patient: p, treatment_id: t.id }} onClose={() => setPay(false)} onSaved={() => { setPay(false); load(); onChanged?.() }} />}
  </>)
}
