import { useCallback, useEffect, useState } from 'react'
import { api, fileUrl } from './api.js'
import { btn, btn2 } from './Fields.jsx'

export default function MediaLibrary() {
  const [items, setItems] = useState([]); const [kind, setKind] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  const load = useCallback(() => api(`/admin/media${kind ? '?kind=' + kind : ''}`).then(setItems).catch((e) => setMsg(e.message)), [kind])
  useEffect(() => { load() }, [load])
  const up = async (e) => {
    const files = [...e.target.files]; if (!files.length) return
    setBusy(true); setMsg('')
    try { const fd = new FormData(); files.forEach((f) => fd.append('files', f)); const r = await api('/admin/media', { method: 'POST', form: fd }); setMsg(r.skipped.length ? `Skipped (images max 10 MB): ${r.skipped.join(', ')}` : `${r.files.length} file(s) uploaded`); load() } catch (x) { setMsg(x.message) }
    setBusy(false); e.target.value = ''
  }
  const del = async (m) => { if (window.confirm('Delete this file? Pages using it will show a broken image.')) { await api(`/admin/media/${m.id}`, { method: 'DELETE' }); load() } }
  const copy = (m) => navigator.clipboard?.writeText(m.url).then(() => setMsg('URL copied'))
  return (<div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl">Media library</h1>
    <div className="flex items-center gap-2"><select className="rounded-md border border-ink/20 px-2 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter"><option value="">All</option><option value="image">Images</option><option value="video">Videos</option></select>
      <label className={`${btn} cursor-pointer`}>{busy ? 'Uploading…' : 'Upload files'}<input type="file" hidden multiple disabled={busy} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={up} /></label></div></div>
    <p className="mb-4 text-xs text-ink/50">Images: JPG, PNG, WebP, GIF up to 10 MB. Videos: MP4, WebM, MOV up to 200 MB.</p>
    {msg && <p role="status" className="mb-4 rounded bg-mist p-3 text-sm">{msg}</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map((m) => (<figure key={m.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
      {m.kind === 'video' ? <video src={fileUrl(m.url)} controls preload="metadata" className="aspect-video w-full bg-black" /> : <img src={fileUrl(m.url)} alt={m.original_name} loading="lazy" className="aspect-video w-full object-cover" />}
      <figcaption className="space-y-2 p-3 text-xs"><p className="truncate font-semibold">{m.original_name}</p><p className="text-ink/50">{(m.size / 1024 / 1024).toFixed(2)} MB</p><div className="flex gap-2"><button className={btn2} onClick={() => copy(m)}>Copy URL</button><button className={`${btn2} text-red-600`} onClick={() => del(m)}>Delete</button></div></figcaption></figure>))}
      {!items.length && <p className="text-ink/50">No files yet.</p>}</div></div>)
}
