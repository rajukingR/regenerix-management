import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Avatar, Confirm, Icon } from './ui.jsx'

/**
 * Dashboard frame shared by the admin, doctor and member portals.
 * Desktop: white sidebar (grouped menu, settings + log out pinned at the bottom) and a top bar with the bell and the user.
 * Mobile: top bar with a menu button; the sidebar slides in as a drawer.
 * groups: [{ heading, items: [{ to, label, icon, end, external }] }]   bottom: same item shape
 */
export default function Shell({ portal, groups, bottom = [], user, bell, onLogout, title = 'Dashboard', context }) {
  const [drawer, setDrawer] = useState(false); const [ask, setAsk] = useState(false); const loc = useLocation()
  useEffect(() => { setDrawer(false) }, [loc.pathname])
  useEffect(() => { if (!drawer) return undefined; const k = (e) => e.key === 'Escape' && setDrawer(false); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [drawer])

  const item = ({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition ${isActive ? 'bg-teal/10 font-semibold text-teal-dark' : 'text-ink/75 hover:bg-mist hover:text-ink'}`
  const link = (i) => i.external
    ? <a href={i.to} target="_blank" rel="noreferrer" className={item({ isActive: false })}><Icon name={i.icon} className="h-[19px] w-[19px] shrink-0" /><span className="flex-1">{i.label}</span><Icon name="ext" className="h-3.5 w-3.5 opacity-50" /></a>
    : <NavLink end={i.end} to={i.to} className={item}><Icon name={i.icon} className="h-[19px] w-[19px] shrink-0" /><span className="flex-1">{i.label}</span>{i.badge ? <span className="rounded-full bg-teal px-1.5 text-xs font-semibold text-white">{i.badge}</span> : null}</NavLink>

  const side = (mobile) => (<div className="flex h-full flex-col bg-white">
    <div className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-ink/10 px-5">
      <Link to={`/${portal.key}`} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-teal font-display text-lg font-bold text-white shadow-sm">R</span>
        <span className="leading-tight"><span className="block font-display text-[17px] font-semibold text-ink">Regenerix</span><span className="block text-[11px] font-medium uppercase tracking-wider text-ink/50">{portal.label}</span></span></Link>
      {mobile && <button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-lg text-ink/60 hover:bg-mist" aria-label="Close menu"><Icon name="x" /></button>}</div>
    <nav aria-label={`${portal.label} menu`} className="flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((g) => (<div key={g.heading}><p className="mb-1.5 mt-5 px-3 text-[12px] font-semibold uppercase tracking-wider text-ink/45">{g.heading}</p>{g.items.map((i) => <div key={i.to + i.label}>{link(i)}</div>)}</div>))}</nav>
    <div className="shrink-0 space-y-1 border-t border-ink/10 p-3">
      {bottom.map((i) => <div key={i.to} className="rounded-lg border border-ink/10">{link(i)}</div>)}
      <button onClick={() => setAsk(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-ink/75 transition hover:bg-mist hover:text-ink"><Icon name="logout" className="h-[19px] w-[19px]" />Log Out</button></div>
  </div>)

  return (<div className="min-h-screen bg-[#F6F8F5] text-ink">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-ink/10 lg:block">{side(false)}</aside>
    {drawer && (<div className="fixed inset-0 z-50 lg:hidden"><div className="a-in absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
      <aside className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] shadow-2xl" style={{ animation: 'slideIn .22s ease both' }}>{side(true)}</aside></div>)}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink/10 bg-white/95 px-4 backdrop-blur lg:h-[72px] lg:px-8">
        <button onClick={() => setDrawer(true)} className="grid h-11 w-11 place-items-center rounded-lg bg-teal text-white shadow-sm lg:hidden" aria-label="Open menu"><Icon name="menu" className="h-6 w-6" /></button>
        <p className="ml-1 flex-1 truncate font-display text-xl font-bold text-ink lg:ml-0 lg:text-[26px]">{title}</p>
        {bell}
        <span className="h-9 w-px bg-ink/10" aria-hidden="true" />
        <Link to={user.to || `/${portal.key}`} className="flex items-center gap-3 rounded-full pr-1 hover:opacity-90"><Avatar name={user.name} src={user.image} size="h-10 w-10 lg:h-11 lg:w-11" />
          <span className="hidden text-left leading-tight sm:block"><span className="block max-w-[180px] truncate text-sm font-semibold uppercase text-ink">{user.name || '…'}</span>{user.sub && <span className="block max-w-[180px] truncate text-xs text-ink/55">{user.sub}</span>}</span></Link>
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8"><Outlet context={context} /></main>
    </div>
    {ask && <Confirm title="Confirm Logout" text={<>Are you sure you want to <b>log out</b>?</>} onNo={() => setAsk(false)} onYes={() => { setAsk(false); onLogout() }} />}
  </div>)
}
