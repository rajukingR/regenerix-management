import { useData } from '../siteContext.jsx'
import { Page, Sec } from '../components/Page.jsx'
import { Empty } from '../components/State.jsx'

const Policy = ({ slug }) => {
  const { POLICIES } = useData(); const [title, paras] = POLICIES[slug] || ['', []]
  return <Page title={title}><Sec>{paras.length ? <div className="mx-auto max-w-2xl space-y-4 text-ink/80">{paras.map((p, i) => <p key={i}>{p}</p>)}</div> : <Empty>This page has no content yet.</Empty>}</Sec></Page>
}

export default Policy
