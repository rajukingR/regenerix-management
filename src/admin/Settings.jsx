import { useEffect, useState } from 'react'
import { api } from './api.js'
import { btn, btn2, inp } from './Fields.jsx'

export default function Settings() {
  const [s, setS] = useState(null); const [msg, setMsg] = useState(''); const [nk, setNk] = useState(''); const [pw, setPw] = useState({ current: '', next: '' })
  useEffect(() => { api('/admin/settings').then(setS).catch((e) => setMsg(e.message)) }, [])
  const save = async () => { try { setS(await api('/admin/settings', { method: 'PUT', body: s })); setMsg('Settings saved') } catch (e) { setMsg(e.message) } }
  const change = async (e) => { e.preventDefault(); try { await api('/auth/password', { method: 'PUT', body: pw }); setPw({ current: '', next: '' }); setMsg('Password changed') } catch (x) { setMsg(x.message) } }
  if (!s) return <p>{msg || 'Loading…'}</p>
  return (<div className="max-w-2xl"><h1 className="mb-5 text-2xl">Settings &amp; account</h1>
    {msg && <p role="status" className="mb-4 rounded bg-mist p-3 text-sm">{msg}</p>}
    <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm"><h2 className="text-lg">Site settings</h2>
      {Object.entries(s).map(([k, v]) => (<label key={k} className="block"><span className="mb-1 block text-xs font-semibold uppercase text-ink/60">{k.replace(/_/g, ' ')}</span>
        {k.includes('message') ? <textarea rows={4} className={inp} value={v || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /> : <input className={inp} value={v || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}</label>))}
      <div className="flex gap-2 border-t border-ink/10 pt-3"><input className={inp} placeholder="new_setting_key" value={nk} onChange={(e) => setNk(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} /><button className={btn2} onClick={() => nk && !(nk in s) && (setS({ ...s, [nk]: '' }), setNk(''))}>Add</button></div>
      <button className={btn} onClick={save}>Save settings</button></section>
    <form onSubmit={change} className="mt-6 space-y-3 rounded-xl bg-white p-5 shadow-sm"><h2 className="text-lg">Change password</h2>
      <input type="password" required autoComplete="current-password" placeholder="Current password" className={inp} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
      <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (min 8 characters)" className={inp} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
      <button className={btn}>Update password</button></form></div>)
}
