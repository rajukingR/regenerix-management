import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { PillBtn } from '../components/Layout.jsx'
import { Check } from '../components/icons.jsx'
import { Page, Sec } from '../components/Page.jsx'
import { Video } from '../components/Media.jsx'
import { Packages } from '../components/sections.jsx'
import NotFound from './NotFound.jsx'

function ServiceDetail({ slug }) {
  const { SERVICES } = useData(); const s = SERVICES.find((x) => x.slug === slug)
  if (!s) return <NotFound />
  return (<Page title={s.name}><Sec><div className="grid items-center gap-10 md:grid-cols-2"><div className="space-y-5">{s.img && <div className="overflow-hidden rounded-2xl"><img src={mediaUrl(s.img)} alt={s.name} className="w-full transition duration-700 hover:scale-105" /></div>}<Video src={s.video} poster={s.img} /></div>
    <div><p className="text-ink/70">{s.long}</p>{s.points.length > 0 && <><h3 className="mb-3 mt-6 text-xl text-teal">What’s included</h3><ul className="space-y-2">{s.points.map((p) => <li key={p} className="flex items-center gap-2 text-sm"><span className="grid h-4 w-4 place-items-center rounded-full bg-teal text-white"><Check className="h-3 w-3" /></span>{p}</li>)}</ul></>}
      <PillBtn to="/contact-us#contact" className="mt-8 border border-ink/10">Book an assessment</PillBtn></div></div></Sec><Packages /></Page>)
}

export default ServiceDetail
