import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, fileUrl } from './api.js'
import { RESOURCES } from './resources.js'
import { Field, btn, btn2 } from './Fields.jsx'

const cell = (col, v) => {
  if (v == null || v === '') return <span className="text-ink/30">—</span>
  if (/(image_url|banner_url)$/.test(col)) return <img src={fileUrl(v)} alt="" className="h-10 w-14 rounded object-cover" />
  if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) return v.slice(0, 10)
  return String(v).length > 70 ? String(v).slice(0, 70) + '…' : String(v)
}

export default function ResourcePage() {
  const { resource } = useParams(); const cfg = RESOURCES[resource]
  const [rows, setRows] = useState([]); const [form, setForm] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => cfg && api(`/admin/${cfg.api}`).then(setRows).catch((e) => setErr(e.message)), [cfg])
  useEffect(() => { setRows([]); setForm(null); setErr(''); load() }, [load])
  if (!cfg) return <p>Unknown section.</p>

  const toggle = async (r) => { try { await api(`/admin/${cfg.api}/${r.id}/toggle`, { method: 'PATCH' }); load() } catch (e) { setErr(e.message) } }
  const remove = async (r) => { if (window.confirm('Delete this item? This cannot be undone.')) try { await api(`/admin/${cfg.api}/${r.id}`, { method: 'DELETE' }); load() } catch (e) { setErr(e.message) } }
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const body = { ...form }
    cfg.fields.filter((f) => f.t === 'list').forEach((f) => { body[f.n] = (body[f.n] || []).map((x) => x.trim()).filter(Boolean) })
    for (const f of cfg.fields.filter((x) => x.t === 'json')) { if (typeof body[f.n] === 'string') { try { body[f.n] = JSON.parse(body[f.n] || '{}') } catch { setErr(`${f.label} is not valid JSON`); setBusy(false); return } } }
    try { await api(`/admin/${cfg.api}${form.id ? '/' + form.id : ''}`, { method: form.id ? 'PUT' : 'POST', body }); setForm(null); load() } catch (x) { setErr(x.message) }
    setBusy(false)
  }

  return (<div>
    <div className="mb-5 flex items-center justify-between"><h1 className="text-2xl">{cfg.title}</h1><button className={btn} onClick={() => setForm({ is_active: true, sort_order: rows.length + 1 })}>+ Add new</button></div>
    {err && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm">
      <thead className="border-b border-ink/10 text-xs uppercase text-ink/60"><tr>{cfg.cols.map((c) => <th key={c} className="px-4 py-3">{c.replace(/_/g, ' ')}</th>)}<th className="px-4 py-3">Active</th><th className="px-4 py-3" /></tr></thead>
      <tbody>{rows.map((r) => (<tr key={r.id} className="border-b border-ink/5 last:border-0">
        {cfg.cols.map((c) => <td key={c} className="px-4 py-3">{cell(c, r[c])}</td>)}
        <td className="px-4 py-3"><button role="switch" aria-checked={r.is_active} aria-label="Toggle active" onClick={() => toggle(r)} className={`h-6 w-11 rounded-full p-0.5 transition ${r.is_active ? 'bg-teal' : 'bg-ink/20'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${r.is_active ? 'translate-x-5' : ''}`} /></button></td>
        <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right"><button className={btn2} onClick={() => setForm(r)}>Edit</button><button className={`${btn2} text-red-600`} onClick={() => remove(r)}>Delete</button></td></tr>))}
        {!rows.length && <tr><td colSpan={cfg.cols.length + 2} className="px-4 py-10 text-center text-ink/50">Nothing here yet.</td></tr>}</tbody></table></div>

    {form && (<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={() => setForm(null)}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6">
        <h2 className="text-xl">{form.id ? 'Edit' : 'Add'} {cfg.title.toLowerCase()}</h2>
        {cfg.fields.map((f) => (<label key={f.n} className="block"><span className="mb-1 block text-sm font-semibold">{f.label}{f.req && ' *'}</span>
          <Field f={f} value={form[f.n]} set={(v) => setForm({ ...form, [f.n]: v })} /></label>))}
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active (visible on the website)</label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className={btn2} onClick={() => setForm(null)}>Cancel</button><button className={btn} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form></div>)}
  </div>)
}
