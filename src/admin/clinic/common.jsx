import { useEffect, useRef, useState } from 'react'
import { api, fileUrl } from '../api.js'
import { Icon, Modal, btn, btn2, fmtDate, inp } from '../../portal/ui.jsx'

// Shared pieces for the clinic screens (patients, consultations, treatments, billing). Built only from the existing portal UI kit.
export const CONS_STATUS = { pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled' }
export const TREAT_STATUS = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }
export const MODES = { cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank transfer', other: 'Other' }
export const PKG = { regular: 'Regular (per visit)', package: 'Package', procedure: 'Procedure' }
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
export const ageOf = (p) => { if (p?.dob) { const b = new Date(`${String(p.dob).slice(0, 10)}T00:00:00`), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a -= 1; return a >= 0 ? `${a}y` : '' } return p?.age != null ? `${p.age}y` : '' }

export const Field = ({ label, children, className = '', hint }) => (<label className={`block text-sm font-semibold ${className}`}>{label}<span className="mt-1.5 block font-normal">{children}</span>{hint && <span className="mt-1 block text-xs font-normal text-ink/55">{hint}</span>}</label>)
export const Err = ({ children }) => (children ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p> : null)
export const Ok = ({ children }) => (children ? <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{children}</p> : null)
// Amount owed (red), settled (muted) or advance held (green)
export const Balance = ({ value }) => (value > 0 ? <span className="whitespace-nowrap font-semibold text-red-700">{rupee(value)} due</span> : value < 0 ? <span className="whitespace-nowrap font-semibold text-emerald-700">{rupee(-value)} advance</span> : <span className="text-ink/45">Settled</span>)

// Doctors come from the Team page (the same list appointments are assigned to).
export function useDoctors() {
  const [doctors, setDoctors] = useState([])
  useEffect(() => { api('/admin/clinic/options').then((r) => setDoctors(r.doctors)).catch(() => {}) }, [])
  return doctors
}
export const DoctorSelect = ({ doctors, value, onChange, blank = '— Not assigned —' }) => (<select className={inp} value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Doctor"><option value="">{blank}</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.role ? ` · ${d.role}` : ''}</option>)}</select>)

// Type-to-search patient chooser. value = patient object or null.
export function PatientPicker({ value, onChange, locked }) {
  const [q, setQ] = useState(''); const [rows, setRows] = useState(null); const seq = useRef(0)
  useEffect(() => {
    if (value || q.trim().length < 2) { setRows(null); return undefined }
    const n = ++seq.current; const t = setTimeout(() => { api(`/admin/clinic/patients?limit=8&q=${encodeURIComponent(q.trim())}`).then((r) => n === seq.current && setRows(r.data)).catch(() => n === seq.current && setRows([])) }, 250)
    return () => clearTimeout(t)
  }, [q, value])
  if (value) return (<div className="flex items-center justify-between gap-3 rounded-lg border border-teal/30 bg-mist/60 px-3.5 py-2.5 text-sm"><span className="min-w-0"><b className="block truncate">{value.name}</b><span className="block truncate text-xs text-ink/60">{[value.file_no, value.phone, ageOf(value)].filter(Boolean).join(' · ')}</span></span>
    {!locked && <button type="button" className="shrink-0 text-xs font-semibold text-teal-dark underline" onClick={() => { onChange(null); setQ('') }}>Change</button>}</div>)
  return (<div className="relative"><Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/40" />
    <input className={`${inp} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or file number…" aria-label="Search patient" autoComplete="off" />
    {rows && (<ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink/15 bg-white py-1 shadow-lg">
      {rows.map((p) => <li key={p.id}><button type="button" className="block w-full px-3.5 py-2 text-left text-sm hover:bg-mist" onClick={() => onChange(p)}><b>{p.name}</b><span className="block text-xs text-ink/55">{[p.file_no, p.phone, p.city].filter(Boolean).join(' · ')}</span></button></li>)}
      {!rows.length && <li className="px-3.5 py-3 text-sm text-ink/55">No patient found. Register them on the Patients page first.</li>}</ul>)}</div>)
}

// Receive a payment. preset: { patient, consultation_id?, treatment_id? }. Leaving "For" on Advance records money held on account.
export function PaymentForm({ preset = {}, onClose, onSaved }) {
  const [patient, setPatient] = useState(preset.patient || null); const [dues, setDues] = useState(null)
  const first = preset.consultation_id ? `consultation:${preset.consultation_id}` : preset.treatment_id ? `treatment:${preset.treatment_id}` : ''
  const [f, setF] = useState({ item: first, amount: '', discount: '', mode: 'cash', paid_on: todayStr(), note: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  useEffect(() => {
    if (!patient) { setDues(null); return undefined } let live = true
    api(`/admin/clinic/patients/${patient.id}/dues`).then((r) => { if (!live) return; setDues(r)
      setF((x) => { const it = r.items.find((i) => `${i.kind}:${i.id}` === x.item) || (x.item ? null : r.items[0]); return { ...x, item: it ? `${it.kind}:${it.id}` : '', amount: it ? String(it.due) : x.amount } }) }).catch((e) => live && setErr(e.message))
    return () => { live = false }
  }, [patient])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const pick = (e) => { const it = dues?.items.find((i) => `${i.kind}:${i.id}` === e.target.value); setF((x) => ({ ...x, item: e.target.value, amount: it ? String(it.due) : '', discount: '' })) }
  const save = async (e) => {
    e.preventDefault(); if (!patient) { setErr('Choose a patient'); return } setBusy(true); setErr('')
    const [kind, id] = f.item.split(':')
    try { const r = await api('/admin/clinic/payments', { method: 'POST', body: { patient_id: patient.id, [`${kind || 'none'}_id`]: id, amount: f.amount, discount: f.discount, mode: f.mode, paid_on: f.paid_on, note: f.note } }); onSaved(r.data) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (<Modal title="Receive payment" sub={dues && patient ? (dues.balance > 0 ? `${patient.name} owes ${rupee(dues.balance)} in total` : dues.balance < 0 ? `${patient.name} has ${rupee(-dues.balance)} in advance` : `${patient.name} has nothing due`) : 'A receipt number is created automatically'} onClose={onClose}><form onSubmit={save} className="space-y-4">
    <Field label="Patient"><PatientPicker value={patient} onChange={(p) => { setPatient(p); setF((x) => ({ ...x, item: '', amount: '' })) }} locked={!!preset.patient} /></Field>
    {patient && (<><Field label="For"><select className={inp} value={f.item} onChange={pick}><option value="">Advance (not linked to an item)</option>{(dues?.items || []).map((i) => <option key={`${i.kind}:${i.id}`} value={`${i.kind}:${i.id}`}>{i.label} · {fmtDate(i.date)} · {rupee(i.due)} due</option>)}</select></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Amount received (₹)"><input type="number" min="0" step="0.01" required className={inp} value={f.amount} onChange={set('amount')} /></Field>
        <Field label="Discount (₹)" hint="Written off, not collected"><input type="number" min="0" step="0.01" className={inp} value={f.discount} onChange={set('discount')} /></Field>
        <Field label="Mode"><select className={inp} value={f.mode} onChange={set('mode')}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Date"><input type="date" required max={todayStr()} className={inp} value={f.paid_on} onChange={set('paid_on')} /></Field></div>
      <Field label="Note for the receipt (optional)"><input className={inp} maxLength={255} value={f.note} onChange={set('note')} /></Field></>)}
    <Err>{err}</Err>
    <div className="flex justify-end gap-2 pt-1"><button type="button" className={btn2} onClick={onClose}>Cancel</button><button className={btn} disabled={busy || !patient}>{busy ? 'Saving…' : 'Save payment'}</button></div></form></Modal>)
}

// ---------- printing (opens a clean page and the browser's print dialog) ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const sheet = (title, clinic, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1F3A33;margin:0;padding:32px;font-size:14px;line-height:1.5}
.head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #6C7952;padding-bottom:14px;margin-bottom:18px}h1{font-size:22px;margin:0}h2{font-size:16px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.06em;color:#566240}
.muted{color:#5d6f69;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:14px}td,th{padding:8px 10px;border-bottom:1px solid #dfe5dd;text-align:left;vertical-align:top}th{width:32%;color:#5d6f69;font-weight:600}
.total td{font-weight:700;font-size:16px;border-top:2px solid #1F3A33;border-bottom:0}.right{text-align:right}.sign{margin-top:56px;text-align:right}.pre{white-space:pre-wrap}@media print{body{padding:12mm}}</style></head><body>
<div class="head"><div><h1>${esc(clinic.name)}</h1><div class="muted">${esc(clinic.address)}</div><div class="muted">${[clinic.phone, clinic.email].filter(Boolean).map(esc).join(' · ')}</div></div><div class="right"><h2>${esc(title)}</h2></div></div>${body}
<script>window.onload=function(){window.print()}<\/script></body></html>`
const rowsHtml = (rows) => rows.filter(([, v]) => v !== '' && v != null).map(([k, v, pre]) => `<tr><th>${esc(k)}</th><td class="${pre ? 'pre' : ''}">${esc(v)}</td></tr>`).join('')
// The window is opened straight from the click so pop-up blockers allow it; the content is filled in once loaded.
async function printPage(load) {
  const w = window.open('', '_blank'); if (!w) { alert('Allow pop-ups for this site to print.'); return }
  w.document.write('<p style="font-family:sans-serif;padding:24px">Preparing…</p>')
  try { const html = await load(); w.document.open(); w.document.write(html); w.document.close() } catch (e) { w.close(); alert(e.message) }
}
// Rupees in words, Indian numbering (lakh / crore), for the bill
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`)
const three = (n) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', two(n % 100)].filter(Boolean).join(' ')
export const inWords = (amount) => {
  const rupees = Math.floor(Number(amount) || 0), paise = Math.round(((Number(amount) || 0) - rupees) * 100)
  const parts = [[Math.floor(rupees / 10000000), 'Crore'], [Math.floor(rupees / 100000) % 100, 'Lakh'], [Math.floor(rupees / 1000) % 100, 'Thousand'], [rupees % 1000, '']].filter(([n]) => n).map(([n, u]) => `${u ? two(n) : three(n)}${u ? ` ${u}` : ''}`)
  return `${parts.join(' ') || 'Zero'} Rupees${paise ? ` and ${two(paise)} Paise` : ''} Only`
}

const BILL_CSS = `*{box-sizing:border-box}html,body{margin:0}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1F3A33;font-size:13px;line-height:1.5;background:#eef1ec;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:14mm 14mm 12mm;display:flex;flex-direction:column;box-shadow:0 2px 14px rgba(31,58,51,.15)}
.top{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:14px;border-bottom:3px solid #6C7952}
.brand{display:flex;align-items:center;gap:14px;min-width:0}.brand img{max-height:64px;max-width:190px;object-fit:contain}.mark{width:56px;height:56px;border-radius:50%;background:#6C7952;color:#fff;font-size:28px;font-weight:700;display:grid;place-items:center;flex:none}
.brand h1{margin:0;font-size:21px;line-height:1.2}.contact{text-align:right;font-size:11.5px;color:#4d615a;max-width:46%}.contact b{color:#1F3A33}
.title{display:flex;justify-content:space-between;align-items:center;margin:16px 0 14px;background:#F2F8F3;border-left:5px solid #6C7952;padding:10px 14px}
.title h2{margin:0;font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:#566240}.title div{text-align:right;font-size:12px}.title b{font-size:14px}
.cols{display:grid;grid-template-columns:1.25fr 1fr;gap:14px}.box{border:1px solid #dfe5dd;border-radius:8px;padding:11px 13px}
.box h3{margin:0 0 6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6C7952}.box .name{font-size:15.5px;font-weight:700}
.kv{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0}.kv dt{color:#5d6f69}.kv dd{margin:0;font-weight:600}
table{width:100%;border-collapse:collapse;margin-top:16px}thead th{background:#1F3A33;color:#fff;text-align:left;padding:9px 12px;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}
tbody td{padding:11px 12px;border-bottom:1px solid #dfe5dd;vertical-align:top}.num{text-align:right;white-space:nowrap}th.num{text-align:right}.c{width:38px;text-align:center}
.desc b{font-size:14px}.desc span{display:block;color:#5d6f69;font-size:12px}
.sum{display:flex;justify-content:space-between;gap:24px;margin-top:6px}.words{flex:1;padding-top:10px;font-size:12px;color:#4d615a}.words b{display:block;color:#1F3A33;font-size:12.5px}
.tot{width:46%;border-collapse:collapse;margin:0}.tot td{padding:6px 12px;border:0}.tot .paid td{background:#6C7952;color:#fff;font-weight:700;font-size:15px}.tot .due td{font-weight:700;border-top:1px solid #dfe5dd}
.red{color:#b42318}.green{color:#18794e}.stamp{display:inline-block;margin-top:10px;border:2px solid #18794e;color:#18794e;border-radius:6px;padding:2px 12px;font-weight:700;letter-spacing:.14em;font-size:12px;transform:rotate(-4deg)}
.note{margin-top:14px;border:1px dashed #cfd8cc;border-radius:8px;padding:8px 12px;font-size:12px}.grow{flex:1}
.sign{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px}.sign .line{width:190px;border-top:1px solid #1F3A33;padding-top:5px;text-align:center;font-size:12px}
.foot{margin-top:16px;border-top:1px solid #dfe5dd;padding-top:10px;text-align:center;font-size:11.5px;color:#5d6f69}.foot b{display:block;color:#566240;font-size:13.5px;margin-bottom:2px}
.bar{position:sticky;top:0;background:#1F3A33;color:#fff;padding:10px 16px;display:flex;justify-content:center;gap:10px;z-index:5}.bar button{font:inherit;border:0;border-radius:6px;padding:7px 18px;font-weight:600;cursor:pointer;background:#fff;color:#1F3A33}.bar button.p{background:#6C7952;color:#fff}
@page{size:A4;margin:0}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:297mm}.bar{display:none}}`

// Printable payment receipt / bill with the clinic logo. Opens as a preview page with Print and Close buttons ("Save as PDF" is in the print dialog).
export const printReceipt = (id) => printPage(async () => {
  const y = (await api(`/admin/clinic/payments/${id}`)).data, p = y.patient || {}, c = y.clinic || {}, it = y.item || {}
  const logo = c.logo ? new URL(fileUrl(c.logo), window.location.origin).href : ''
  const linked = it.charged != null, settled = y.amount + (y.discount || 0)
  const who = [p.name, [ageOf(p), p.gender && p.gender[0].toUpperCase() + p.gender.slice(1)].filter(Boolean).join(', ')].filter(Boolean)
  const tot = [linked && ['Sub total', rupee(it.charged)], linked && it.paid_before > 0 && ['Paid earlier', `− ${rupee(it.paid_before)}`], y.discount > 0 && ['Discount', `− ${rupee(y.discount)}`]].filter(Boolean)
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(y.receipt_no)} - ${esc(p.name)}</title><style>${BILL_CSS}</style></head><body>
<div class="bar"><button class="p" onclick="window.print()">Print / Save as PDF</button><button onclick="send('wa')">Send on WhatsApp</button><button onclick="send('email')">Send by email</button><button onclick="window.close()">Close</button></div>
<script>function send(k){var o=window.opener;if(!o||!o.rgxReceipt){alert('Open this receipt from the dashboard to send it.');return}
if(k==='wa'){var w=window.open('','_blank');o.rgxReceipt.whatsapp(${Number(y.id)},w).then(function(r){if(r&&r.local)alert(r.note)}).catch(function(e){alert(e.message)})}
else o.rgxReceipt.email(${JSON.stringify({ id: y.id, receipt_no: y.receipt_no, patient_email: p.email || '' }).replace(/</g, '\\u003c')},window).then(function(m){if(m)alert(m)}).catch(function(e){alert(e.message)})}<\/script>
<div class="page">
  <div class="top"><div class="brand">${logo ? `<img src="${esc(logo)}" alt="" onerror="this.outerHTML='<span class=mark>${esc((c.name || 'R')[0])}</span>'">` : `<span class="mark">${esc((c.name || 'R')[0])}</span>`}<h1>${esc(c.name)}</h1></div>
    <div class="contact">${esc(c.address)}${c.phone ? `<br><b>Phone:</b> ${esc(c.phone)}` : ''}${c.email ? `<br><b>Email:</b> ${esc(c.email)}` : ''}</div></div>
  <div class="title"><h2>Payment receipt</h2><div>Receipt no <b>${esc(y.receipt_no)}</b><br>Date <b>${esc(fmtDate(y.paid_on))}</b></div></div>
  <div class="cols">
    <div class="box"><h3>Billed to</h3><div class="name">${esc(who[0] || '')}${who[1] ? ` <span style="font-weight:400;font-size:13px">(${esc(who[1])})</span>` : ''}</div>
      <dl class="kv">${[['File no', p.file_no], ['Contact', p.phone], ['Address', [p.address, p.city].filter(Boolean).join(', ')]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
    <div class="box"><h3>Payment details</h3><dl class="kv">${[['Mode', MODES[y.mode] || y.mode], ['Paid on', fmtDate(y.paid_on)], ['Received by', y.received_by], ['Note', y.note]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div></div>
  <table><thead><tr><th class="c">#</th><th>Description</th><th class="num">Amount</th></tr></thead>
    <tbody><tr><td class="c">1</td><td class="desc"><b>${esc(it.title || 'Payment')}</b>${(it.lines || []).map((l) => `<span>${esc(l)}</span>`).join('')}</td><td class="num">${esc(rupee(linked ? it.charged : y.amount))}</td></tr></tbody></table>
  <div class="sum"><div class="words">Amount received in words<b>${esc(inWords(y.amount))}</b>${linked && it.due_after <= 0 ? '<span class="stamp">PAID IN FULL</span>' : ''}</div>
    <table class="tot">${tot.map(([k, v]) => `<tr><td>${k}</td><td class="num">${esc(v)}</td></tr>`).join('')}
      <tr class="paid"><td>Amount received</td><td class="num">${esc(rupee(y.amount))}</td></tr>
      ${linked ? `<tr class="due"><td>Balance on this bill</td><td class="num ${it.due_after > 0 ? 'red' : 'green'}">${esc(it.due_after > 0 ? rupee(it.due_after) : 'Nil')}</td></tr>` : ''}
      ${p.balance > 0 && (!linked || Math.abs(p.balance - it.due_after) > 0.001) ? `<tr><td>Total outstanding (all bills)</td><td class="num red">${esc(rupee(p.balance))}</td></tr>` : p.balance < 0 ? `<tr><td>Advance held on account</td><td class="num green">${esc(rupee(-p.balance))}</td></tr>` : ''}</table></div>
  ${c.note ? `<div class="note">${esc(c.note)}</div>` : ''}
  <div class="grow"></div>
  <div class="sign"><div style="font-size:11.5px;color:#5d6f69">Settled with this receipt: ${esc(rupee(settled))}${y.discount > 0 ? ` (${esc(rupee(y.amount))} received + ${esc(rupee(y.discount))} discount)` : ''}</div><div class="line">Authorised signatory<br><b>${esc(c.name)}</b></div></div>
  <div class="foot"><b>Thank you for choosing ${esc(c.name)}.</b>This is a computer-generated receipt.</div>
</div></body></html>`
})
// ---------- sending a receipt to the patient ----------
const LOCAL_NOTE = 'WhatsApp opened with the message. Note: the receipt link points to this computer (localhost), so the patient can open it only after the site is online.'
// Opens WhatsApp chat with the patient's number and a ready message containing a private link to the receipt PDF.
// (WhatsApp does not let a website attach a file to someone's chat; a link is the way to deliver the PDF.) The tab is opened straight from the click so pop-up blockers allow it.
export async function whatsappReceipt(id, win) {
  const w = win || window.open('', '_blank'); if (!w) throw new Error('Allow pop-ups for this site to open WhatsApp.')
  try {
    const r = await api(`/admin/clinic/payments/${id}/share`)
    if (!r.wa) throw new Error(r.phone ? `The mobile number on file (${r.phone}) is not a valid WhatsApp number` : 'This patient has no mobile number on file. Add one to their file first.')
    w.location.href = r.wa; return { ...r, note: LOCAL_NOTE }
  } catch (e) { w.close(); throw e }
}
// Emails the receipt PDF. The address is shown first so it can be checked or changed; Cancel sends nothing.
export async function emailReceipt(y, win = window) {
  const to = win.prompt(`Email receipt ${y.receipt_no} as a PDF to:`, y.patient_email || ''); if (to === null) return null
  if (!to.trim()) throw new Error('Enter an email address')
  const r = await api(`/admin/clinic/payments/${y.id}/email`, { method: 'POST', body: { email: to.trim() } })
  return `Receipt ${y.receipt_no} was emailed to ${r.to}.`
}
if (typeof window !== 'undefined') window.rgxReceipt = { whatsapp: whatsappReceipt, email: emailReceipt } // used by the buttons on the receipt preview page

// Print / WhatsApp / Email buttons for one receipt row. notify(message, isError) defaults to a browser alert.
export function ReceiptActions({ y, notify = (m) => window.alert(m), children }) {
  const [busy, setBusy] = useState('')
  const run = async (k, fn) => { setBusy(k); try { const m = await fn(); if (m) notify(m, false) } catch (e) { notify(e.message, true) } setBusy('') }
  return (<div className="flex flex-wrap justify-end gap-2"><button className={btn2} onClick={() => printReceipt(y.id)}>Print</button>
    <button className={btn2} disabled={!!busy} title="Open WhatsApp with the patient's number and the receipt link" onClick={() => run('wa', async () => { const r = await whatsappReceipt(y.id); return r.local ? r.note : '' })}>{busy === 'wa' ? 'Opening…' : 'WhatsApp'}</button>
    <button className={btn2} disabled={!!busy} title="Email the receipt PDF to the patient" onClick={() => run('mail', () => emailReceipt(y))}>{busy === 'mail' ? 'Sending…' : 'Email'}</button>{children}</div>)
}

export const printConsultation = (id) => printPage(async () => {
  const c = (await api(`/admin/clinic/consultations/${id}`)).data, p = c.patient || {}, s = await api('/admin/settings')
  return sheet('Consultation', { name: s.site_name || 'Regenerix', address: s.address || s.short_address || '', phone: s.phone || '', email: s.email || '' },
    `<table>${rowsHtml([['Case no', c.case_no], ['Visit date', fmtDate(c.visit_date)], ['Patient', [p.name, ageOf(p), p.gender].filter(Boolean).join(', ')], ['File no', p.file_no], ['Doctor', c.doctor_name],
      ['Height / weight', [c.height_cm && `${c.height_cm} cm`, c.weight_kg && `${c.weight_kg} kg`].filter(Boolean).join(' / ')], ['Complaints', c.complaints, 1], ['Allergies / notes', c.allergies, 1], ['Examination', c.examination, 1],
      ['Diagnosis', c.diagnosis, 1], ['Investigation', c.investigation, 1], ['Advice', c.advice, 1], ['Prescription', c.prescription, 1], ['Next visit', fmtDate(c.next_visit_date)]])}</table><div class="sign"><div class="muted">Doctor</div><b>${esc(c.doctor_name || '')}</b></div>`)
})
