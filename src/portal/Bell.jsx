import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, ago } from './ui.jsx'

// detail may arrive as an object or as a JSON string; never let a bad value crash the dashboard
export const parse = (d) => { if (d && typeof d === 'object') return d; try { return JSON.parse(d) || {} } catch { return {} } }
const ICON = { appointment_booking: 'calendar', appointment_assigned: 'steth', appointment_unassigned: 'calendar', appointment_updated: 'calendar', appointment_update: 'calendar', appointment_booked: 'calendar',
  job_application: 'file', application_status: 'brief', doctor_update: 'checkCircle' }
const subline = (d) => [d.customer_name || d.candidate_name, d.job_title, d.reference].filter(Boolean).join(' · ')

/** Shared notification bell. base = '/admin' | '/doctor' | '/member'; target(n) = where clicking goes; all = full list page. */
export default function Bell({ api, base, target, all }) {
  const nav = useNavigate(); const [open, setOpen] = useState(false); const [items, setItems] = useState([]); const [unread, setUnread] = useState(0); const [err, setErr] = useState('')
  const busy = useRef(false); const box = useRef(null)
  const load = useCallback(async () => {
    if (busy.current) return; busy.current = true // never two requests at once
    try { const d = await api(`${base}/notifications?limit=20`); setItems(d.notifications); setUnread(d.unread_count); setErr('') } catch (e) { setErr(e.message) } finally { busy.current = false }
  }, [api, base])
  useEffect(() => {
    load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 20000), onEvt = () => load(), onVis = () => document.visibilityState === 'visible' && load()
    window.addEventListener('NEW_NOTIFICATION', onEvt); document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); window.removeEventListener('NEW_NOTIFICATION', onEvt); document.removeEventListener('visibilitychange', onVis) }
  }, [load])
  useEffect(() => { const out = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', out); return () => document.removeEventListener('mousedown', out) }, [])

  const go = async (n) => {
    if (!n.is_read) { try { await api(`${base}/notifications/${n.id}/read`, { method: 'PATCH' }); setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))); setUnread((u) => Math.max(0, u - 1)); window.dispatchEvent(new Event('NOTIFICATIONS_CHANGED')) } catch { /* still navigate */ } }
    setOpen(false); nav(target(n))
  }
  const readAll = async () => { try { await api(`${base}/notifications/read-all`, { method: 'PATCH' }); setItems((l) => l.map((x) => ({ ...x, is_read: 1 }))); setUnread(0); window.dispatchEvent(new Event('NOTIFICATIONS_CHANGED')) } catch (e) { setErr(e.message) } }

  return (<div className="relative" ref={box}>
    <button onClick={() => { setOpen(!open); if (!open) load() }} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-mist">
      <Icon name="bell" className="h-[22px] w-[22px]" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && (<div className="a-down fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-ink/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[380px]">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2>{unread > 0 && <button className="text-xs font-medium text-teal-dark hover:underline" onClick={readAll}>Mark all as read</button>}</div>
      {err && <p className="bg-red-50 px-4 py-2 text-xs text-red-700">{err}</p>}
      <ul className="max-h-[60vh] overflow-y-auto">{items.map((n) => { const d = parse(n.detail); return (<li key={n.id}><button onClick={() => go(n)} className={`flex w-full gap-3 border-b border-ink/5 px-4 py-3 text-left transition hover:bg-mist ${n.is_read ? '' : 'bg-teal/5'}`}>
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal/10 text-teal-dark"><Icon name={ICON[n.message_type] || 'bell'} className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0 flex-1"><span className={`block text-sm ${n.is_read ? 'text-ink/70' : 'font-semibold text-ink'}`}>{n.message}</span>
          {subline(d) && <span className="block truncate text-xs text-ink/55">{subline(d)}</span>}
          <span className="block text-xs text-ink/45">{ago(n.created_at)}</span></span>
        {!n.is_read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" aria-label="Unread" />}</button></li>) })}
        {!items.length && !err && <li className="px-4 py-10 text-center text-sm text-ink/50">No notifications yet.</li>}</ul>
      {all && <button onClick={() => { setOpen(false); nav(all) }} className="block w-full border-t border-ink/10 py-2.5 text-center text-sm font-medium text-teal-dark hover:bg-mist">View all notifications</button>}</div>)}
  </div>)
}
