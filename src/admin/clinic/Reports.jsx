import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Alert, Card, Icon, Loading, PageHead, StatCard, btn, btn2, fmtDate, inp } from '../../portal/ui.jsx'
import { MODES, rupee, todayStr } from './common.jsx'

const shift = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const PRESETS = [['Today', () => [todayStr(), todayStr()]], ['Last 7 days', () => [shift(-6), todayStr()]], ['This month', () => [`${todayStr().slice(0, 8)}01`, todayStr()]], ['Last 30 days', () => [shift(-29), todayStr()]], ['This year', () => [`${todayStr().slice(0, 4)}-01-01`, todayStr()]]]

// Simple label / bar / value rows. Bars share one scale so they can be compared at a glance.
const Bars = ({ rows, value = (r) => r.total, label = (r) => r.key, format = rupee, empty }) => {
  const max = Math.max(1, ...rows.map(value))
  return rows.length ? (<ul className="mt-3 space-y-2.5 text-sm">{rows.map((r) => (<li key={label(r)}><div className="flex justify-between gap-3"><span className="truncate">{label(r)}</span><b className="shrink-0">{format(value(r))}</b></div>
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-teal" style={{ width: `${Math.max(2, (value(r) / max) * 100)}%` }} /></div></li>))}</ul>) : <p className="mt-3 text-sm text-ink/55">{empty}</p>
}

export default function Reports() {
  const [from, setFrom] = useState(`${todayStr().slice(0, 8)}01`); const [to, setTo] = useState(todayStr()); const [applied, setApplied] = useState({ from, to })
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { setLoading(true); try { setD(await api(`/admin/clinic/reports?from=${applied.from}&to=${applied.to}`)); setErr('') } catch (e) { setErr(e.message) } setLoading(false) }, [applied])
  useEffect(() => { load() }, [load])
  const go = (a, b) => { setFrom(a); setTo(b); setApplied({ from: a, to: b }) }
  const m = d?.money, c = d?.counts
  return (<div><PageHead title="Reports" sub={d ? `${fmtDate(d.from)} to ${fmtDate(d.to)}` : 'Clinic activity and money for a date range'} />
    <form onSubmit={(e) => { e.preventDefault(); setApplied({ from, to }) }} className="mb-5 flex flex-col gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="flex flex-wrap gap-2">{PRESETS.map(([l, fn]) => { const [a, b] = fn(); return <button type="button" key={l} className={`${btn2} ${applied.from === a && applied.to === b ? 'border-teal bg-teal/10 text-teal-dark' : ''}`} onClick={() => go(a, b)}>{l}</button> })}</div>
      <div className="flex flex-wrap items-center gap-2 lg:ml-auto"><label className="flex items-center gap-2 text-xs text-ink/60">From<input type="date" required max={to} className={inp} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-xs text-ink/60">To<input type="date" required min={from} max={todayStr()} className={inp} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className={btn}><Icon name="search" className="h-4 w-4" />Show</button></div></form>
    <Alert onRetry={load}>{err}</Alert>
    {!d ? (loading && <Loading />) : (<div className={loading ? 'opacity-60' : ''}>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Billed" value={rupee(m.billed)} icon="file" />
        <StatCard label="Collected" value={rupee(m.collected)} icon="checkCircle" />
        <StatCard label="Expenses" value={rupee(m.expenses)} icon="brief" />
        <StatCard label="Net (collected − expenses)" value={`${m.net < 0 ? '−' : ''}${rupee(Math.abs(m.net))}`} icon="trend" />
        <StatCard label="New Patients" value={c.new_patients} icon="users" />
        <StatCard label="Consultations" value={c.consultations} icon="steth" />
        <StatCard label="New Treatments" value={c.new_treatments} icon="layers" />
        <StatCard label="Treatment Visits" value={c.visits} icon="calendar" hint={c.home_visits ? `${c.home_visits} at home` : undefined} />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card><h3 className="text-lg">Billed by source</h3><Bars rows={[{ key: 'Consultation fees', total: m.consultation_fees }, { key: 'Treatment visits', total: m.treatment_visits }, { key: 'Packages sold', total: m.packages }].filter((r) => r.total > 0)} empty="Nothing was billed in this period." />
          {m.discounts > 0 && <p className="mt-4 border-t border-ink/10 pt-3 text-sm text-ink/70">Discounts given: <b>{rupee(m.discounts)}</b></p>}</Card>
        <Card><h3 className="text-lg">Collected by payment mode</h3><Bars rows={d.by_mode} label={(r) => `${MODES[r.key] || r.key} (${r.count})`} empty="No payments in this period." /></Card>
        <Card><h3 className="text-lg">Doctors</h3>{d.doctors.length ? (<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-ink/50"><tr><th className="py-2 pr-3 font-medium">Doctor</th><th className="py-2 pr-3 font-medium">Consultations</th><th className="py-2 pr-3 font-medium">Visits</th><th className="py-2 text-right font-medium">Billed</th></tr></thead>
          <tbody>{d.doctors.map((r) => <tr key={r.doctor_id ?? 0} className="border-t border-ink/10"><td className="py-2.5 pr-3 font-medium">{r.name}</td><td className="py-2.5 pr-3">{r.consultations}</td><td className="py-2.5 pr-3">{r.visits}</td><td className="py-2.5 text-right font-semibold">{rupee(r.billed)}</td></tr>)}</tbody></table></div>) : <p className="mt-3 text-sm text-ink/55">No consultations or visits in this period.</p>}</Card>
        <Card><h3 className="text-lg">Expenses by category</h3><Bars rows={d.expense_categories} label={(r) => `${r.key} (${r.count})`} empty="No expenses in this period." /></Card>
        <Card><h3 className="text-lg">Collected per day</h3><Bars rows={d.by_day} label={(r) => fmtDate(r.key)} empty="No payments in this period." /></Card>
        <Card><h3 className="text-lg">Referrals (new patients)</h3><Bars rows={d.referrals} value={(r) => r.count} format={(n) => n} empty="No referred patients registered in this period." /></Card>
      </div></div>)}
  </div>)
}
