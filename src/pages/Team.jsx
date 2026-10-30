import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Page, Sec } from '../components/Page.jsx'
import { Empty } from '../components/State.jsx'

function Team() {
  const { TEAM } = useData()
  return (<Page title="Our Team"><Sec>{!TEAM.length ? <Empty>Our team will be listed here soon.</Empty> : <div className="space-y-12">{TEAM.map((m) => (<div key={m.id} id={m.id} className="grid scroll-mt-28 gap-8 md:grid-cols-[280px_1fr]">{m.img && <img src={mediaUrl(m.img)} alt={m.name} className="w-full rounded-tl-3xl rounded-br-[80px]" />}
    <div><h2 className="text-2xl text-teal">{m.name}</h2><p className="text-ink/70">{m.role}</p><p className="mt-3 text-ink/70">{m.bio}</p></div></div>))}</div>}</Sec></Page>)
}

export default Team
