import { Fragment, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useData, useNavTree, useSite } from '../siteContext.jsx'
import { ErrorBox, Loader } from './State.jsx'
import { Form } from './ui.jsx'
import { Arrow, Mail, Phone, Pin } from './icons.jsx'

export const PillBtn = ({ to, children, className = '' }) => (
  <Link to={to} className={`group inline-flex items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-xs font-medium text-ink transition hover:shadow-lg ${className}`}>
    {children}<span className="grid h-8 w-8 place-items-center rounded-full bg-teal text-white transition-transform group-hover:translate-x-1"><Arrow /></span></Link>)

const SOC = [['x', '𝕏'], ['facebook', 'f'], ['youtube', '▶'], ['linkedin', 'in'], ['instagram', '◎']]

function NavLinks({ cls, dd, setDd }) {
  const tree = useNavTree()
  return tree.map((n) => n.children?.length ? (
    <div key={n.id} className="relative" onMouseEnter={() => setDd(n.id)} onMouseLeave={() => setDd(null)}>
      <NavLink to={n.path || '#'} className={cls}>{n.label}</NavLink>
      {dd === n.id && <div className="a-down absolute left-0 top-full z-50 w-72 rounded-xl bg-white p-2 text-ink shadow-xl">
        {n.path && <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-mist" to={n.path}>All {n.label === 'Service' ? 'Services' : n.label}</Link>}
        {n.children.map((x) => <Link key={x.id} className="block rounded-lg px-3 py-2 text-sm hover:bg-mist" to={x.path}>{x.label}</Link>)}</div>}
    </div>) : <NavLink key={n.id} to={n.path || '#'} end={n.path === '/'} className={cls}>{n.label}</NavLink>)
}

function Header() {
  const [open, setOpen] = useState(false); const [dd, setDd] = useState(false); const [dd2, setDd2] = useState(false); const [sc, setSc] = useState(false); const { pathname } = useLocation(); const home = pathname === '/'; const tree = useNavTree(); const { SITE } = useData(); const soc = (k) => SITE.social.find(([n]) => n.toLowerCase() === k)?.[1]
  useEffect(() => { setOpen(false); setDd(false); setDd2(false) }, [pathname])
  useEffect(() => { const f = () => setSc(window.scrollY > 180); f(); window.addEventListener('scroll', f); return () => window.removeEventListener('scroll', f) }, [])
  const cls = ({ isActive }) => `px-4 py-2 text-base font-medium transition hover:text-teal ${isActive ? 'text-teal' : 'text-ink'}`
  const cls3 = ({ isActive }) => `px-4 py-2 text-sm font-bold uppercase text-white transition hover:text-white/70 ${isActive ? 'underline underline-offset-8' : ''}`
  const cls2 = ({ isActive }) => `px-4 py-2 text-sm font-medium uppercase transition hover:text-teal ${isActive ? 'text-teal' : 'text-ink'}`
  return (<>
    {/* Static header: info bar + white bar (desktop) */}
    {home && <div className="hidden lg:block">
      <div className="bg-[#EDEDED]"><div className="flex items-center justify-between px-5 py-3 text-sm font-medium">
        <div className="flex items-center gap-8"><span className="flex items-center gap-2"><Pin className="h-5 w-5" />{SITE.shortAddress}</span>
          <a href={`mailto:${SITE.email}`} className="flex items-center gap-2"><Mail className="h-5 w-5" />{SITE.email}</a></div>
        <div className="flex gap-3">{SOC.filter(([k]) => soc(k)).map(([k, g]) => <a key={k} aria-label={k} href={soc(k)} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-[#D9DAD3] text-sm font-bold text-ink/70 transition hover:bg-teal hover:text-white">{g}</a>)}</div></div></div>
      <div className="flex items-center justify-between bg-white px-7 py-5">
        <div className="flex items-center gap-24"><Link to="/"><img src={SITE.logo} alt="Regenerix" className="h-14" /></Link><nav className="flex items-center" aria-label="Main"><NavLinks cls={cls} dd={dd} setDd={setDd} /></nav></div>
        <Link to="/contact-us#contact" className="btn !px-5 !py-3.5 !text-[11px]">Book Appointment</Link></div>
    </div>}
    {/* Inner pages: glass pill floating over the banner */}
    {!home && <div className="absolute inset-x-5 top-5 z-30 hidden lg:block">
      <div className="flex items-center justify-between rounded-xl bg-teal/80 px-12 py-4 text-white backdrop-blur-md">
        <div className="flex items-center gap-20"><Link to="/"><img src={SITE.logo2} alt="Regenerix" className="h-14" /></Link><nav className="flex items-center" aria-label="Main"><NavLinks cls={cls3} dd={dd} setDd={setDd} /></nav></div>
        <div className="flex items-center gap-8"><a href={`tel:+${SITE.tel}`} className="flex items-center gap-3 font-semibold"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal"><Phone className="h-5 w-5" /></span>{SITE.phone}</a>
          <PillBtn to="/contact-us#contact" className="!py-2 !pl-7 !text-base">Book Appointment</PillBtn></div></div></div>}
    <div className="h-20 lg:hidden" />
    {/* Sticky header: full-width white bar after scroll on desktop, always on mobile */}
    <header className={`fixed inset-x-0 top-0 z-40 bg-white text-ink shadow-[0_6px_24px_-8px_rgba(0,0,0,.25)] ${sc ? 'a-down' : 'lg:hidden'}`}>
      <div className="mx-auto flex max-w-[1310px] items-center justify-between px-5 py-3 lg:py-4">
        <div className="flex items-center lg:gap-44"><Link to="/"><img src={SITE.logo} alt="Regenerix" className="h-12 lg:h-[52px]" /></Link>
          <nav className="hidden items-center lg:flex" aria-label="Sticky"><NavLinks cls={cls2} dd={dd2} setDd={setDd2} /></nav></div>
        <div className="flex items-center gap-4">
          <a className="hidden items-center gap-3 lg:flex" href={`tel:+${SITE.tel}`}><span className="grid h-11 w-11 place-items-center rounded-full bg-teal text-white"><Phone className="h-5 w-5" /></span>
            <span className="leading-tight"><span className="block text-base">Call Anytime</span><span className="block text-base text-ink/50">{SITE.phone}</span></span></a>
          <button className="text-2xl lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button></div></div>
      {open && <nav className="a-down border-t border-ink/10 px-5 py-3 lg:hidden" aria-label="Mobile">
        {tree.map((n) => <Fragment key={n.id}><NavLink to={n.path || '#'} end={n.path === '/'} className={({ isActive }) => `block py-2 text-sm font-semibold uppercase ${isActive ? 'text-teal' : ''}`}>{n.label}</NavLink>{(n.children || []).map((x) => <Link key={x.id} to={x.path} className="block py-1.5 pl-4 text-sm text-ink/70">{x.label}</Link>)}</Fragment>)}
        <Link to="/contact-us#contact" className="btn mt-3 w-full">Book Appointment</Link><Link to="/member" className="mt-2 block py-2 text-center text-sm font-semibold text-ink/70">My Account / Login</Link></nav>}
    </header>
  </>)
}

function Footer() {
  const q = [['/privacy-policy', 'Privacy Policy'], ['/terms-and-condition', 'Terms & Condition'], ['/refund-and-returns-policy', 'Refund and Returns Policy'], ['/faqs', 'Faqs'], ['/careers', 'Career']]
  const { pages } = useSite(); const tree = useNavTree(); const { SITE } = useData()
  const qa = (pages || []).length ? q.filter(([p]) => pages.some((x) => `/${x.slug}` === p)) : q // links to switched-off pages are hidden
  const l = 'block py-1 text-sm text-white/70 transition hover:translate-x-1 hover:text-white'
  return (
    <footer className="mx-3 mt-16 overflow-hidden rounded-2xl md:mx-8">
      <div className="relative bg-teal text-white">
        <span className="a-sway absolute bottom-10 left-6 h-24 w-14 rounded-full bg-white/10" /><span className="a-sway absolute bottom-0 right-4 h-32 w-8 rounded-full bg-white/10" />
        <div className="wrap relative grid gap-10 py-16 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div><img src={SITE.logo2} alt="Regenerix" className="mb-5 h-14" />
            <p className="max-w-xs text-sm text-white/70">{SITE.about}</p>
            <PillBtn to="/contact-us#contact" className="mt-6">Get Appointment</PillBtn></div>
          <div><h4 className="mb-3 underline decoration-white/40">Quick Links</h4>{qa.map(([t, n]) => <Link key={t} to={t} className={l}>{n}</Link>)}<Link to="/member" className={l}>My Account</Link></div>
          <div><h4 className="mb-3 underline decoration-white/40">Services</h4>{(tree.find((n) => n.path === '/service')?.children || []).map((s) => <Link key={s.id} to={s.path} className={l}>{s.label}</Link>)}</div>
          <div className="text-sm text-white/80"><h4 className="mb-3 text-white underline decoration-white/40">Contact</h4><p>{SITE.address}</p>
            <a className="mt-2 block" href={`tel:+${SITE.tel}`}>{SITE.phone}</a><a className="block" href={`mailto:${SITE.email}`}>{SITE.email}</a>
            {SITE.hours.map(([d, h]) => <p key={d} className="mt-2">{d}: {h}</p>)}</div>
        </div>
      </div>
      <div className="bg-sage py-5"><div className="wrap flex flex-col justify-between gap-3 text-sm text-ink md:flex-row">
        <p>© {new Date().getFullYear()} {SITE.name}. All Rights Reserved.</p>
        <div className="flex flex-wrap gap-4">{SITE.social.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer" className="hover:underline">{n}</a>)}</div></div></div>
    </footer>
  )
}

export function Newsletter() {
  return <div className="rounded-2xl bg-mist p-6"><h3 className="text-xl">Stay Updated With Expert Advice</h3>
    <p className="mb-4 mt-1 text-sm text-ink/70">Join our mailing list to receive professional therapist tips and exclusive offers.</p>
    <Form type="newsletter" button="Subscribe" success="You’re subscribed. Thank you!" fields={[{ name: 'email', label: 'Email', type: 'email', required: true, wide: true }]} /></div>
}

export default function Layout() {
  const { pathname, hash } = useLocation(); const [top, setTop] = useState(false); const { status, error, retry } = useSite(); const { waLink } = useData()
  useEffect(() => { if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 50); else window.scrollTo(0, 0) }, [pathname, hash])
  useEffect(() => { const f = () => setTop(window.scrollY > 600); window.addEventListener('scroll', f); return () => window.removeEventListener('scroll', f) }, [])
  return (<>
    {status === 'ready' && <Header />}
    <main>{status === 'ready' ? <Outlet /> : status === 'error' ? <ErrorBox message={error} onRetry={retry} /> : <Loader />}</main>
    {status === 'ready' && <Footer />}
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-center gap-3">
      <a href={waLink()} target="_blank" rel="noreferrer" aria-label="Book on WhatsApp" className="a-ring grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-lg"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14c-.2.6-1.300 1.200-1.800 1.200-.5.1-1 .2-3.200-.7-2.700-1.100-4.400-3.800-4.500-4-.1-.2-1.100-1.400-1.100-2.700s.7-1.900.9-2.200c.2-.3.5-.3.700-.3h.5c.2 0 .4 0 .6.500l.8 2c.1.200.1.300 0 .5l-.3.500-.4.400c-.1.200-.3.300-.1.600.2.300.8 1.300 1.700 2.100 1.100 1 2.100 1.300 2.400 1.400.3.100.4.100.6-.1l.8-1c.2-.3.400-.2.600-.1l1.900.9c.3.100.5.200.5.300.1.200.1.700-.1 1.300z" /></svg></a>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className={`grid h-11 w-11 place-items-center rounded-full bg-sage/80 text-white transition-all duration-300 ${top ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>↑</button>
    </div>
  </>)
}
