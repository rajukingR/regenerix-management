import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Heading, TextReveal } from '../components/ui.jsx'
import { Page, Sec } from '../components/Page.jsx'
import { Video } from '../components/Media.jsx'
import { ServicePanel, Why, Stats, TeamGrid } from '../components/sections.jsx'

const About = () => {
  const { sec } = useData(); const intro = sec('about', 'intro'), story = sec('about', 'story'), mission = sec('about', 'mission'), vision = sec('about', 'vision')
  return (<Page title="About">
    {intro && <Sec><p className="pill mb-4">About Us</p><div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-end"><TextReveal text={intro.title || ''} className="max-w-xs text-4xl leading-tight text-teal md:text-5xl" />
      <p className="max-w-md text-sm text-ink/70">{intro.body}</p></div></Sec>}
    {story && <Sec><div className="grid items-start gap-10 md:grid-cols-[.8fr_1fr]"><div>{story.image_url && <img src={mediaUrl(story.image_url)} alt="" className="w-full rounded-2xl object-cover" />}<Video src={story.video_url} className="mt-5" /></div>
      <div><p className="pill mb-4">About Us</p><TextReveal text={story.title || ''} className="text-3xl text-teal md:text-5xl" /><p className="mt-5 text-sm text-ink/70">{story.body}</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">{[mission, vision].filter(Boolean).map((x) => <div key={x.id}><h3 className="text-xl text-teal">{x.title}</h3><p className="mt-2 text-sm text-ink/70">{x.body}</p></div>)}</div></div></div></Sec>}
    <ServicePanel title="Comprehensive Care for Every Stage" /><Why /><Stats />
    <Sec><Heading kicker="Our Experts" title="Meet our Doctors, You’re in Good Hands" /><TeamGrid /></Sec></Page>)
}

export default About
