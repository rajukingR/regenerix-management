import { useState } from 'react'
import { useData } from '../siteContext.jsx'
import { Newsletter } from '../components/Layout.jsx'
import { Page, Sec } from '../components/Page.jsx'
import { Empty } from '../components/State.jsx'
import { BlogCard } from '../components/sections.jsx'

function Blogs() {
  const { BLOGS } = useData(); const [q, setQ] = useState(''); const list = BLOGS.filter((b) => `${b.title} ${b.excerpt}`.toLowerCase().includes(q.toLowerCase()))
  return (<Page title="Blogs"><Sec><div className="mx-auto max-w-3xl">{BLOGS.length > 0 && <input className="input mb-8" placeholder="Search articles" aria-label="Search articles" value={q} onChange={(e) => setQ(e.target.value)} />}
    {list.length ? <div className="space-y-8">{list.map((b) => <BlogCard key={b.slug} b={b} />)}</div> : <Empty>{BLOGS.length ? `No articles match “${q}”. Try a different keyword.` : 'No articles have been published yet.'}</Empty>}
    <div className="mt-12"><Newsletter /></div></div></Sec></Page>)
}

export default Blogs
