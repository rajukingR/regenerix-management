import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fileUrl } from '../admin/api.js'

// ---------- icons (24px line icons, stroke = currentColor) ----------
const P = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  userCheck: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4',
  userX: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 8l5 5M22 8l-5 5',
  brief: 'M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2M4 6h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3 12h18',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16', x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5', checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  xCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9l6 6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  alert: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01',
  steth: 'M5 3v6a5 5 0 0 0 10 0V3M5 3H3M15 3h2M10 14v2a5 5 0 0 0 10 0v-3M20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  plus: 'M12 5v14M5 12h14', eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ext: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zM15.5 7.5l3 3L22 7l-3-3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
}
export const Icon = ({ name, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name] || P.grid} /></svg>)

// ---------- shared class names (existing palette: ink / teal / mist / field / sage) ----------
export const inp = 'w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-ink/40 focus:border-teal focus:ring-2 focus:ring-teal/15'
export const btn = 'inline-flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50'
export const btn2 = 'inline-flex items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50'
export const btnDanger = 'inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50'

export const initials = (n) => String(n || '?').replace(/^(dr\.?\s+)/i, '').trim().charAt(0).toUpperCase() || '?'
export const t12 = (t) => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
export const fmtDate = (d) => { if (!d) return ''; const x = new Date(`${String(d).slice(0, 10)}T00:00:00`); return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
export const fmtDateTime = (d) => { if (!d) return ''; const x = new Date(String(d).replace(' ', 'T')); return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) }
export const ago = (v) => { const s = Math.max(0, (Date.now() - new Date(String(v).replace(' ', 'T')).getTime()) / 1000); if (Number.isNaN(s)) return ''; if (s < 60) return 'Just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return fmtDate(v) }
export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString()

export function Avatar({ name, src, size = 'h-11 w-11', className = '' }) {
  return src ? <img src={fileUrl(src)} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`} />
    : <span className={`${size} grid shrink-0 place-items-center rounded-full border-2 border-ink/15 bg-mist text-base font-bold text-ink ${className}`} aria-hidden="true">{initials(name)}</span>
}
// Name + email cell, like the member list in the reference layout
export const Person = ({ name, sub, src }) => (<div className="flex items-center gap-3"><Avatar name={name} src={src} /><div className="min-w-0"><p className="truncate font-medium text-ink">{name}</p>{sub && <p className="truncate text-xs text-ink/55">{sub}</p>}</div></div>)

// ---------- status pills ----------
export const APPT_STATUS = { pending: 'Pending', confirmed: 'Confirmed', rescheduled: 'Rescheduled', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled', no_show: 'No-show' }
export const APP_STATUS = { new: 'Received', under_review: 'Under review', shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected', rejected: 'Not shortlisted' }
const TONE = { pending: 'bg-amber-50 text-amber-800 ring-amber-200', new: 'bg-amber-50 text-amber-800 ring-amber-200', under_review: 'bg-sky-50 text-sky-800 ring-sky-200',
  confirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-200', shortlisted: 'bg-emerald-50 text-emerald-800 ring-emerald-200', selected: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rescheduled: 'bg-sky-50 text-sky-800 ring-sky-200', interview: 'bg-sky-50 text-sky-800 ring-sky-200', completed: 'bg-teal/10 text-teal-dark ring-teal/30',
  rejected: 'bg-red-50 text-red-700 ring-red-200', cancelled: 'bg-red-50 text-red-700 ring-red-200', no_show: 'bg-ink/5 text-ink/70 ring-ink/15', active: 'bg-emerald-50 text-emerald-800 ring-emerald-200', off: 'bg-ink/5 text-ink/60 ring-ink/15' }
export const Pill = ({ s, map = APPT_STATUS, children }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE[s] || TONE.off}`}>{children || map[s] || s}</span>

// ---------- layout pieces ----------
export const PageHead = ({ title, sub, children }) => (<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl text-ink md:text-[28px]">{title}</h1>{sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}</div>{children && <div className="flex flex-wrap gap-2">{children}</div>}</div>)
export const Card = ({ className = '', children }) => <section className={`min-w-0 rounded-xl border border-ink/10 bg-white p-5 shadow-sm ${className}`}>{children}</section>
export const Alert = ({ children, onRetry, tone = 'error' }) => children ? <p role={tone === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg px-4 py-3 text-sm ${tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-mist text-ink'}`}>{children} {onRetry && <button className="font-semibold underline" onClick={onRetry}>Retry</button>}</p> : null
export const Loading = ({ label = 'Loading…' }) => <div className="grid place-items-center py-16 text-sm text-ink/50" role="status"><span className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-teal/20 border-t-teal" />{label}</div>

// Stat card: label + icon tile on top, big number, small trend line underneath
export function StatCard({ label, value, icon = 'users', hint, down, to, onClick }) {
  const body = (<><div className="flex items-start justify-between gap-3"><p className="text-sm leading-snug text-ink/60">{label}</p><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal text-white shadow-sm"><Icon name={icon} className="h-6 w-6" /></span></div>
    <p className="-mt-2 text-3xl font-bold text-ink">{value ?? '—'}</p>{hint && <p className={`mt-2 text-xs font-medium ${down ? 'text-red-600' : 'text-emerald-700'}`}>{down ? '↓' : '↑'} {hint}</p>}</>)
  const cls = 'block rounded-xl border border-ink/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-5'
  if (to) return <Link to={to} className={cls}>{body}</Link>
  if (onClick) return <button onClick={onClick} className={`${cls} w-full`}>{body}</button>
  return <div className={cls}>{body}</div>
}

// Table with S.No column. columns: [{ label, render(row), className }]
export function DataTable({ columns, rows, start = 0, loading, empty = 'Nothing to show yet.', minWidth = 760 }) {
  return (<div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm"><div className="overflow-x-auto">
    <table className="w-full text-left text-sm" style={{ minWidth }}><thead className="bg-[#EEF1EC] text-ink"><tr><th className="w-16 px-4 py-4 text-center font-bold">S.No</th>{columns.map((c) => <th key={c.label} className={`px-4 py-4 font-bold ${c.head || ''}`}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (<tr key={r.id ?? i} className="border-t border-ink/10 align-middle transition hover:bg-mist/60"><td className="px-4 py-5 text-center text-ink/70">{start + i + 1}</td>{columns.map((c) => <td key={c.label} className={`px-4 py-5 ${c.className || ''}`}>{c.render(r)}</td>)}</tr>))}
        {!rows.length && <tr><td colSpan={columns.length + 1} className="px-4 py-14 text-center text-ink/50">{loading ? 'Loading…' : empty}</td></tr>}</tbody></table></div></div>)
}

// Numbered pager with round buttons
export function Pager({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return total ? <p className="mt-4 text-center text-xs text-ink/50">{total} result{total === 1 ? '' : 's'}</p> : null
  const nums = []; for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i)
  const b = 'grid h-9 min-w-[36px] place-items-center rounded-full px-2 text-sm transition disabled:opacity-30'
  return (<nav className="mt-5 flex flex-col items-center gap-2" aria-label="Pagination"><div className="flex items-center gap-1">
    <button className={`${b} hover:bg-mist`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="left" className="h-4 w-4" /></button>
    {nums.map((n) => <button key={n} className={`${b} ${n === page ? 'bg-teal font-semibold text-white' : 'hover:bg-mist'}`} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button>)}
    <button className={`${b} hover:bg-mist`} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><Icon name="right" className="h-4 w-4" /></button></div>
    <span className="text-xs text-ink/50">{total} results</span></nav>)
}

export function Modal({ title, sub, onClose, children, wide, footer }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', k); document.body.style.overflow = o } }, [onClose])
  return (<div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-start sm:p-4" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className={`a-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:my-10 sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink/10 bg-white px-5 py-4"><div><h2 className="text-lg font-semibold">{title}</h2>{sub && <div className="mt-0.5 text-sm text-ink/60">{sub}</div>}</div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-ink/60 hover:bg-mist" aria-label="Close"><Icon name="x" /></button></div>
      <div className="space-y-5 px-5 py-5">{children}</div>{footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 px-5 py-4">{footer}</div>}</div></div>)
}

// Small confirm dialog (used for logout, like the reference)
export function Confirm({ title, text, yes = 'Yes', no = 'No', onYes, onNo, danger }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onNo(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onNo])
  return (<div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4" onMouseDown={onNo}><div role="alertdialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="a-in w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
    <h2 className="text-xl">{title}</h2><p className="mt-3 text-ink/70">{text}</p>
    <div className="mt-6 flex justify-end gap-2"><button autoFocus className="rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide text-teal-dark hover:bg-mist" onClick={onNo}>{no}</button><button className={`rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-red-50 ${danger === false ? 'text-teal-dark' : 'text-red-600'}`} onClick={onYes}>{yes}</button></div></div></div>)
}

export const Detail = ({ items }) => (<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{items.filter(Boolean).map(([k, v, wide]) => <div key={k} className={wide ? 'sm:col-span-2' : ''}><dt className="text-xs font-medium uppercase tracking-wide text-ink/50">{k}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-ink">{v || '—'}</dd></div>)}</dl>)

// Filter bar: search + selects; on mobile everything stacks full width like the reference
export const Toolbar = ({ onSubmit, children }) => <form onSubmit={(e) => { e.preventDefault(); onSubmit?.() }} className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">{children}</form>
export const SearchBox = ({ value, onChange, placeholder = 'Search for anything…' }) => (<label className="relative block sm:w-64"><span className="sr-only">Search</span><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
  <input className={`${inp} border-teal/40 pl-9`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>)
export const Select = ({ value, onChange, children, label, className = 'sm:w-48' }) => <select aria-label={label} className={`${inp} ${className} border-teal/40`} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
export const Tabs = ({ value, onChange, items }) => (<div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-ink/10 bg-white p-1 shadow-sm" role="tablist">{items.map(([k, l, n]) => (
  <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${value === k ? 'bg-teal text-white shadow-sm' : 'text-ink/70 hover:bg-mist'}`}>{l}{n != null && <span className={`rounded-full px-1.5 text-xs ${value === k ? 'bg-white/25' : 'bg-ink/10'}`}>{n}</span>}</button>))}</div>)
