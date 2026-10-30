import { useState } from 'react'
import { fileUrl, uploadFile } from './api.js'

export const inp = 'w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-teal'
export const btn = 'rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50'
export const btn2 = 'rounded-md border border-ink/20 px-3 py-1.5 text-sm hover:bg-mist'

const LIMITS = { image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], mb: 10 }, video: { types: ['video/mp4', 'video/webm', 'video/quicktime'], mb: 200 } }

// Choose a file -> preview it immediately -> upload with a progress bar. Replace by choosing again; Remove clears the field.
export function MediaField({ value, onChange, kind }) {
  const [pct, setPct] = useState(null); const [err, setErr] = useState(''); const [local, setLocal] = useState('')
  const rule = LIMITS[kind] || LIMITS.image
  const pick = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return
    if (!rule.types.includes(f.type)) return setErr(`Unsupported file. Use ${rule.types.map((t) => t.split('/')[1]).join(', ')}.`)
    if (f.size > rule.mb * 1024 * 1024) return setErr(`File is too large (maximum ${rule.mb} MB).`)
    setErr(''); setLocal(URL.createObjectURL(f)); setPct(0)
    try {
      const r = await uploadFile(f, setPct)
      if (!r.files?.length) throw new Error('The file was rejected by the server')
      onChange(r.files[0].url)
    } catch (x) { setErr(x.message) }
    setPct(null); setLocal('')
  }
  const shown = local || fileUrl(value), busy = pct !== null
  return (<div>
    <div className="flex gap-2"><input className={inp} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Paste a URL or upload a file" />
      <label className={`${btn2} shrink-0 cursor-pointer`}>{value ? 'Replace' : 'Upload'}<input type="file" hidden disabled={busy} accept={rule.types.join(',')} onChange={pick} /></label>
      {value && !busy && <button type="button" className={`${btn2} shrink-0 text-red-600`} onClick={() => onChange('')}>Remove</button>}</div>
    {busy && <div className="mt-2"><div className="h-2 overflow-hidden rounded bg-ink/10"><div className="h-full bg-teal transition-all" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs text-ink/60">Uploading… {pct}%</p></div>}
    {err && <p role="alert" className="mt-1 text-xs text-red-600">{err}</p>}
    {shown && (kind === 'video' ? <video src={shown} controls preload="metadata" className="mt-2 h-32 rounded" /> : <img src={shown} alt="" className="mt-2 h-24 rounded object-cover" />)}
  </div>)
}

export function Pager({ page, pages, total, onPage }) {
  return (<div className="mt-4 flex items-center justify-between text-sm"><span className="text-ink/60">{total} result{total === 1 ? '' : 's'}</span>
    <div className="flex items-center gap-2"><button className={btn2} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button className={btn2} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div></div>)
}

export function Field({ f, value, set }) {
  const v = value ?? ''
  if (f.t === 'textarea') return <textarea rows={f.rows || 4} className={inp} value={v} onChange={(e) => set(e.target.value)} />
  if (f.t === 'list') return <textarea rows={5} className={inp} value={(value || []).join('\n')} onChange={(e) => set(e.target.value.split('\n'))} />
  if (f.t === 'image' || f.t === 'video') return <MediaField kind={f.t} value={value} onChange={set} />
  if (f.t === 'json') return <textarea rows={8} className={`${inp} font-mono text-xs`} value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)} onChange={(e) => set(e.target.value)} />
  if (f.t === 'date') return <input type="date" className={inp} value={String(v).slice(0, 10)} onChange={(e) => set(e.target.value)} />
  return <input type={f.t === 'number' ? 'number' : 'text'} className={inp} value={v} onChange={(e) => set(e.target.value)} />
}
