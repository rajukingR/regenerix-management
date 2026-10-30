import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parse } from './Bell.jsx'
import { Alert, Icon, Loading, PageHead, btn2, fmtDateTime } from './ui.jsx'

/** Full notification list for any portal. */
export default function Notifications({ api, base, target }) {
  const nav = useNavigate(); const [d, setD] = useState(null); const [err, setErr] = useState(''); const [only, setOnly] = useState(false)
  const load = useCallback(async () => { try { setD(await api(`${base}/notifications?limit=50`)); setErr('') } catch (e) { setErr(e.message) } }, [api, base])
  useEffect(() => { load(); const f = () => load(); window.addEventListener('NOTIFICATIONS_CHANGED', f); return () => window.removeEventListener('NOTIFICATIONS_CHANGED', f) }, [load])
  const open = async (n) => { if (!n.is_read) await api(`${base}/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {}); nav(target(n)) }
  const readAll = async () => { await api(`${base}/notifications/read-all`, { method: 'PATCH' }).catch((e) => setErr(e.message)); load() }
  if (!d) return err ? <Alert onRetry={load}>{err}</Alert> : <Loading />
  const list = only ? d.notifications.filter((n) => !n.is_read) : d.notifications
  return (<div><PageHead title="Notifications" sub={d.unread_count ? `${d.unread_count} unread` : 'You are all caught up'}>
    <button className={btn2} onClick={() => setOnly(!only)}>{only ? 'Show all' : 'Unread only'}</button>{d.unread_count > 0 && <button className={btn2} onClick={readAll}><Icon name="check" className="h-4 w-4" />Mark all as read</button>}</PageHead>
    <Alert onRetry={load}>{err}</Alert>
    <ul className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">{list.map((n) => { const x = parse(n.detail); return (<li key={n.id} className="border-b border-ink/10 last:border-0">
      <button onClick={() => open(n)} className={`flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-mist sm:px-5 ${n.is_read ? '' : 'bg-teal/5'}`}>
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-teal'}`} aria-label={n.is_read ? undefined : 'Unread'} />
        <span className="min-w-0 flex-1"><span className={`block ${n.is_read ? 'text-ink/75' : 'font-semibold text-ink'}`}>{n.message}</span>
          <span className="mt-1 block text-xs text-ink/50">{[x.customer_name || x.candidate_name, x.job_title, x.reference].filter(Boolean).join(' · ')}{(x.customer_name || x.candidate_name || x.job_title || x.reference) ? ' · ' : ''}{fmtDateTime(n.created_at)}</span></span>
        <Icon name="right" className="mt-1 h-4 w-4 shrink-0 text-ink/30" /></button></li>) })}
      {!list.length && <li className="px-4 py-14 text-center text-sm text-ink/50">No notifications.</li>}</ul></div>)
}
