import { Link, useLocation } from 'react-router-dom'
import { useData, useSite } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Reveal } from './ui.jsx'
import { Chevrons } from './icons.jsx'

// Title and banner image come from the matching row in the dashboard's Pages screen; detail pages fall back to the default banner setting.
export const Page = ({ title, children }) => {
  const { pathname } = useLocation(); const { BANNER } = useData(); const { pages } = useSite()
  const pg = (pages || []).find((p) => `/${p.slug}` === pathname)
  const t = pg?.title || title, banner = mediaUrl(pg?.banner_url || BANNER)
  const bg = banner ? { backgroundImage: `linear-gradient(rgba(20,40,30,.25),rgba(20,40,30,.35)),url(${banner})` } : undefined
  return (<>
    <section className="relative flex h-[380px] items-center justify-center bg-teal-dark bg-cover bg-center pt-10 text-center text-white lg:h-[525px] lg:pt-16" style={bg}>
      <div><h1 className="a-up text-5xl font-bold leading-none md:text-[84px]">{t}</h1>
        <p className="a-up d1 mt-5 flex items-center justify-center gap-3 text-lg"><Link to="/">Home</Link><Chevrons className="h-3 w-3" />{t}</p></div>
      <Chevrons className="a-chev absolute right-[36%] top-[72%] hidden h-12 w-12 text-white/60 md:block" /></section>{children}</>)
}

export const Sec = ({ children, className = '', id }) => <section id={id} className={`py-16 md:py-20 ${className}`}><Reveal className="wrap">{children}</Reveal></section>
