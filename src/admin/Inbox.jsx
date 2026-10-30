import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, openResume } from './api.js'
import { btn2 } from './Fields.jsx'

const KINDS = {
  messages: { title: 'Messages', cols: ['name', 'email', 'phone', 'service', 'subject', 'message'] },
  subscribers: { title: 'Newsletter subscribers', cols: ['email'] },
}
const day = (v) => (v ? String(v).slice(0, 16).replace('T', ' ') : '')

export default function Inbox() {
  const { kind } = useParams(); const cfg = KINDS[kind]
  const [rows, setRows] = useState([]); const [err, setErr] = useState('')
  const load = useCallback(() => cfg && api(`/admin/${kind}`).then(setRows).catch((e) => setErr(e.message)), [kind, cfg])
  useEffect(() => { setRows([]); load() }, [load])
  if (!cfg) return <p>Unknown inbox.</p>
  const status = async (r, v) => { await api(`/admin/${kind}/${r.id}`, { method: 'PUT', body: { status: v } }); load() }
  const toggle = async (r) => { await api(`/admin/${kind}/${r.id}/toggle`, { method: 'PATCH' }); load() }
  const del = async (r) => { if (window.confirm('Delete this entry?')) { await api(`/admin/${kind}/${r.id}`, { method: 'DELETE' }); load() } }
  return (<div><h1 className="mb-5 text-2xl">{cfg.title}</h1>{err && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b border-ink/10 text-xs uppercase text-ink/60"><tr><th className="px-4 py-3">Received</th>{cfg.cols.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}<th className="px-4 py-3">{kind === 'subscribers' ? 'Subscribed' : 'Status'}</th><th /></tr></thead>
      <tbody>{rows.map((r) => (<tr key={r.id} className="border-b border-ink/5 align-top last:border-0"><td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">{day(r.created_at)}</td>
        {cfg.cols.map((c) => <td key={c} className="max-w-xs px-4 py-3">{r[c]}</td>)}
        <td className="px-4 py-3">{kind === 'subscribers' ? <button className={btn2} onClick={() => toggle(r)}>{r.is_active ? 'Active' : 'Unsubscribed'}</button>
          : <select className="rounded border border-ink/20 px-2 py-1" value={r.status} onChange={(e) => status(r, e.target.value)}><option value="new">New</option><option value="read">Read</option><option value="done">Done</option></select>}</td>
        <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">{kind === 'applications' && <button className={btn2} onClick={() => openResume(r.id)}>Resume</button>}<button className={`${btn2} text-red-600`} onClick={() => del(r)}>Delete</button></td></tr>))}
        {!rows.length && <tr><td colSpan={cfg.cols.length + 3} className="px-4 py-10 text-center text-ink/50">Nothing here yet.</td></tr>}</tbody></table></div></div>)
}
