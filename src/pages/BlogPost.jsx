import { Link } from 'react-router-dom'
import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Page, Sec } from '../components/Page.jsx'
import { Video } from '../components/Media.jsx'
import NotFound from './NotFound.jsx'

function BlogPost({ slug }) {
  const { BLOGS } = useData(); const b = BLOGS.find((x) => x.slug === slug)
  if (!b) return <NotFound />
  return (<Page title="Blogs"><Sec><article className="mx-auto max-w-2xl"><h2 className="mb-6 text-3xl text-teal">{b.title}</h2>{b.img && <img src={mediaUrl(b.img)} alt="" className="mb-8 w-full rounded-2xl" />}<Video src={b.video} poster={b.img} className="mb-8" />
    {b.body.map((p, i) => <p key={i} className="mb-5 text-lg leading-relaxed text-ink/80">{p}</p>)}<Link to="/blogs" className="text-teal">← All articles</Link></article></Sec></Page>)
}

export default BlogPost
