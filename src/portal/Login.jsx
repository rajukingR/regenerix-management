import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { loggedIn, makeApi, setToken } from './api.js'
import { Icon, btn, inp } from './ui.jsx'

const TEXT = {
  admin: ['Admin dashboard', 'Manage the website, appointments, doctors and job applications.'],
  doctor: ['Doctor dashboard', 'See the appointments assigned to you and update their status.'],
  member: ['My Regenerix', 'Track your appointments and job applications, and get updates when anything changes.'],
}

export function AuthFrame({ portal, children }) {
  const [h, p] = TEXT[portal]
  return (<main className="grid min-h-screen bg-[#F6F8F5] lg:grid-cols-[1.05fr_1fr]">
    <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal/40" aria-hidden="true" /><div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal/25" aria-hidden="true" />
      <Link to="/" className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-teal font-display text-xl font-bold">R</span><span className="font-display text-2xl">Regenerix</span></Link>
      <div className="relative max-w-md"><p className="mb-3 text-sm uppercase tracking-[0.2em] text-sage">{h}</p><h1 className="text-4xl leading-tight">Care that moves with you.</h1><p className="mt-4 text-white/75">{p}</p></div>
      <p className="relative text-xs text-white/50">© Regenerix</p></section>
    <section className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md">
      <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-full bg-teal font-display text-lg font-bold text-white">R</span><span className="font-display text-xl text-ink">Regenerix</span></Link>
      {children}</div></section></main>)
}

const Field = ({ label, ...p }) => <label className="block text-sm font-semibold text-ink">{label}<input className={`${inp} mt-1.5 py-3`} {...p} /></label>

/** Admin and doctor share one login endpoint; the account's role decides which dashboard opens. */
export function StaffLogin({ portal = 'admin' }) {
  const nav = useNavigate(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  if (loggedIn(portal)) return <Navigate to={`/${portal}`} replace />
  const go = async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr('')
    try {
      const r = await makeApi(portal)('/auth/login', { method: 'POST', body: f })
      const role = r.admin?.role === 'doctor' ? 'doctor' : 'admin'
      setToken(role, r.token); nav(`/${role}`, { replace: true })
    } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (<AuthFrame portal={portal}><form onSubmit={go} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
    <div><h1 className="text-2xl text-ink">{portal === 'doctor' ? 'Doctor login' : 'Admin login'}</h1><p className="mt-1 text-sm text-ink/60">Sign in with the email and password given to you.</p></div>
    <Field label="Email" type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
    <Field label="Password" type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
    {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    <button className={`${btn} w-full py-3`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <p className="text-center text-xs text-ink/50">{portal === 'doctor' ? <Link className="hover:text-teal-dark" to="/admin/login">Admin login</Link> : <Link className="hover:text-teal-dark" to="/doctor/login">Doctor login</Link>} · <Link className="hover:text-teal-dark" to="/member/login">Patient / applicant login</Link></p></form></AuthFrame>)
}

/** Members (patients and job applicants): log in or create an account. */
export function MemberLogin() {
  const nav = useNavigate(); const [sp] = useSearchParams(); const [mode, setMode] = useState(sp.get('mode') === 'register' ? 'register' : 'login')
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  if (loggedIn('member')) return <Navigate to="/member" replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const go = async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr('')
    try {
      const body = mode === 'login' ? { email: f.email, password: f.password } : f
      const r = await makeApi('member')(`/member/auth/${mode}`, { method: 'POST', body })
      const next = sp.get('next'); setToken('member', r.token); nav(next && /^\/(?!\/)/.test(next) ? next : '/member', { replace: true })
    } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (<AuthFrame portal="member"><form onSubmit={go} className="space-y-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-mist p-1" role="tablist">{[['login', 'Log in'], ['register', 'Create account']].map(([k, l]) => <button type="button" key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setErr('') }} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === k ? 'bg-white text-ink shadow-sm' : 'text-ink/60'}`}>{l}</button>)}</div>
    <div><h1 className="text-2xl text-ink">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mt-1 text-sm text-ink/60">{mode === 'login' ? 'Log in to see your appointments and applications.' : 'Use the same email and mobile number you booked or applied with, and your earlier records appear automatically.'}</p></div>
    {mode === 'register' && <Field label="Full name" required autoComplete="name" value={f.name} onChange={set('name')} />}
    <Field label="Email" type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
    {mode === 'register' && <Field label="Mobile number" type="tel" required autoComplete="tel" value={f.phone} onChange={set('phone')} />}
    <Field label="Password" type="password" required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} placeholder={mode === 'register' ? 'At least 8 characters' : ''} />
    {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    <button className={`${btn} w-full py-3`} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink/50"><Icon name="steth" className="h-3.5 w-3.5" />Staff? <Link className="hover:text-teal-dark" to="/doctor/login">Doctor login</Link> · <Link className="hover:text-teal-dark" to="/admin/login">Admin login</Link></p></form></AuthFrame>)
}
