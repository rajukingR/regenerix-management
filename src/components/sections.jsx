import { Link } from 'react-router-dom'
import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Empty } from './State.jsx'
import AppointmentForm from './AppointmentForm.jsx'
import { Counter, Reveal, TextReveal } from './ui.jsx'
import { Arrow, ArrowUR, Check, Leaf, Mail, Phone, Pin } from './icons.jsx'
import { Sec } from './Page.jsx'

export function ServiceRows() {
  const { SERVICES, ROWS } = useData()
  if (!SERVICES.length) return <Empty>No services are available right now.</Empty>
  return (<div>{SERVICES.map((s, i) => (
    <Link key={s.slug} to={`/${s.slug}`} className="group grid items-center gap-6 border-b border-ink/10 py-10 md:grid-cols-3 md:gap-10">
      <div><Leaf className="h-10 w-10 text-teal transition-transform duration-500 group-hover:rotate-12" /><h3 className="mt-3 text-xl">{s.name}</h3></div>
      <div className="relative overflow-hidden rounded-lg"><img src={mediaUrl(s.img)} alt={s.name} loading="lazy" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-110" />
        <span className="absolute bottom-0 left-0 rounded-tr-lg bg-ink/60 px-3 py-1 text-3xl text-white backdrop-blur">0{i + 1}.</span></div>
      <div><p className="text-sm text-ink/70">{ROWS[s.slug]}</p><span className="mt-4 inline-flex items-center gap-2 border-b border-ink/10 pb-1 text-sm text-teal">View Details <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
    </Link>))}</div>)
}

export const ServicePanel = ({ title = 'Comprehensive Care for Every Stage' }) => (<section className="mx-3 rounded-2xl bg-mist py-16 md:mx-8"><Reveal className="wrap"><div className="mb-6 text-center"><p className="pill mb-4">Service Area</p><TextReveal text={title} className="text-3xl text-teal md:text-5xl" /></div><ServiceRows /></Reveal></section>)

export const Packages = () => { const { PACKAGES } = useData(); if (!PACKAGES.length) return null; return (<Sec><div className="mb-10 text-center"><h2 className="text-4xl font-bold uppercase text-teal md:text-5xl">Packages & Program</h2><p className="mt-1 text-2xl">Your Path to Better Health Starts Here</p></div>
  <div className="mx-auto grid max-w-4xl gap-0 md:grid-cols-3 md:items-center">{PACKAGES.map((p, i) => { const mid = i === 1; return (
    <div key={p.name} className={`flex flex-col border p-8 transition-transform duration-300 hover:-translate-y-2 ${mid ? 'border-teal bg-teal py-12 text-white' : 'border-ink/25 bg-white'}`}>
      <h3 className={`text-xl ${mid ? '' : 'text-teal'}`}>{p.name}</h3><p className="mt-2 text-sm font-medium">{p.sub}</p>{p.dur && <p className="mt-1 text-xs"><b>Duration:</b> {p.dur}</p>}
      <hr className={`my-4 ${mid ? 'border-white/40' : 'border-ink/60'}`} /><p className={`flex-1 text-sm ${mid ? 'text-white/90' : 'text-ink/60'}`}>{p.text}</p>
      <Link to="/contact-us#contact" className={`mt-6 self-start px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition hover:opacity-80 ${mid ? 'bg-white/40 text-white' : 'bg-teal text-white'}`}>Book now</Link></div>) })}</div></Sec>) }

export const Why = () => { const { WHY2, sec } = useData(); const w = sec('home', 'why'); if (!WHY2.length) return null; return (<Sec><div className="grid items-center gap-10 md:grid-cols-[1fr_1.1fr]">
  <div className="relative"><img src={mediaUrl(w?.image_url)} alt="" loading="lazy" className="w-full rounded-bl-[999px] rounded-tr-[999px] object-cover [border-radius:0_0_0_999px/0_0_0_999px]" />
    <Leaf className="a-sway absolute -top-8 left-8 h-20 w-14 text-teal/50" /></div>
  <div><p className="pill mb-4">Why Choose Us</p><TextReveal text={w?.title ?? ''} className="mb-8 text-3xl text-teal md:text-4xl" />
    <div className="grid gap-4 sm:grid-cols-2">{WHY2.map(([t, d, l]) => (<div key={t} className="rounded-xl bg-mist p-5 transition hover:-translate-y-1 hover:shadow-lg"><Leaf className="h-8 w-8 text-teal" /><h3 className="mt-3 text-lg">{t}</h3><p className="mt-1 text-sm text-ink/70">{d}</p>
      <ul className="mt-3 space-y-1 text-sm">{l.map((x) => <li key={x} className="flex items-center gap-2"><span className="grid h-4 w-4 place-items-center rounded-full bg-teal text-white"><Check className="h-3 w-3" /></span>{x}</li>)}</ul></div>))}</div></div></div></Sec>) }

export const Stats = () => { const { STATS } = useData(); if (!STATS.length) return null; return (<section className="py-10"><div className="mx-3 flex items-center gap-4 md:mx-8"><span className="h-px flex-1 bg-ink/10" /><p className="text-teal">Our Experience Speaks for Itself</p><span className="h-px flex-1 bg-ink/10" /></div>
  <div className="wrap grid grid-cols-2 gap-8 py-10 text-center md:grid-cols-4">{STATS.map(([l, n, s]) => (<div key={l}><p className="text-5xl text-teal md:text-6xl"><Counter to={n} suffix={s} /></p><p className="mt-1 text-sm text-ink/70">{l}</p></div>))}</div>
  <div className="mx-3 h-px bg-ink/10 md:mx-8" /></section>) }

export const TeamGrid = () => { const { TEAM, LEADS } = useData(); if (!TEAM.length) return <Empty>Our team will be listed here soon.</Empty>; return (<div className="flex flex-wrap gap-5">{TEAM.map((m) => (
  <Link key={m.id} to={`/team-detail#${m.id}`} className="group relative block w-64 overflow-hidden rounded-tl-3xl rounded-br-[80px] bg-teal"><img src={mediaUrl(m.img)} alt={m.name} loading="lazy" className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-105" />
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-dark/95 to-transparent p-5 pt-16 text-white"><h3 className="text-lg">{m.name}</h3><p className="text-xs text-white/75">{LEADS[m.id]}</p></div></Link>))}</div>) }

export const BlogCard = ({ b }) => (<article className="group overflow-hidden rounded-xl border border-ink/10 bg-white"><div className="relative overflow-hidden"><img src={mediaUrl(b.img)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-105" />
  <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-md bg-teal text-lg text-white">{String(b.date || '').slice(8, 10)}</span></div>
  <div className="p-6"><h3 className="text-lg"><Link to={`/${b.slug}`}>{b.title}</Link></h3><p className="mt-2 text-sm text-ink/60">{b.excerpt}</p>
    <Link to={`/${b.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm text-teal">Read More <span className="grid h-6 w-6 place-items-center rounded-full bg-mist transition group-hover:bg-teal group-hover:text-white"><ArrowUR className="h-3 w-3" /></span></Link></div></article>)

export const InfoCards = () => { const { SITE } = useData(); return (<div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-3">{[[Pin, 'Address Line', SITE.address], [Phone, 'Phone Number', SITE.phone], [Mail, 'Mail Adress', SITE.email]].map(([I, t, d]) => (
  <div key={t} className="rounded-xl bg-white p-7 text-center shadow-[0_6px_30px_-10px_rgba(31,58,51,.2)] transition hover:-translate-y-1"><I className="mx-auto h-10 w-10 text-teal" /><h3 className="mt-3 text-base font-semibold">{t}</h3><p className="mt-2 break-words text-xs text-ink/60">{d}</p></div>))}</div>) }

export const BookPanel = () => { const { SITE } = useData(); return (<div className="mx-auto grid max-w-4xl gap-8 rounded-[36px] bg-white p-6 shadow-[0_10px_50px_-15px_rgba(31,58,51,.25)] md:grid-cols-2 md:p-9">
  <iframe title="Regenerix location" loading="lazy" className="h-72 w-full rounded-2xl border-0 md:h-full md:min-h-[300px]" src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.address)}&output=embed`} />
  <div><p className="pill mb-3">Get IN Touch</p><h2 className="mb-5 text-3xl text-teal md:text-4xl">Book An Appointment</h2><AppointmentForm /></div></div>) }
