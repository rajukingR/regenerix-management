import { Link } from 'react-router-dom'
import { useData } from '../siteContext.jsx'
import { mediaUrl } from '../lib/api.js'
import { Form, Reveal } from '../components/ui.jsx'
import { Brief, Pin } from '../components/icons.jsx'
import { Page, Sec } from '../components/Page.jsx'
import { Empty } from '../components/State.jsx'

const Careers = () => {
  const { JOBS, LIMITS } = useData()
  return (<Page title="Career">
    <section className="py-24 lg:py-32"><Reveal className="mx-auto w-full max-w-[1310px] px-5">
      {JOBS.length === 0 ? <Empty>There are no open positions right now. You can still send us your details below.</Empty>
        : <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{JOBS.map((j) => (
          <article key={j.id} className="w-full max-w-[420px] rounded-[36px] border border-ink/30 p-[30px] transition hover:-translate-y-1 hover:shadow-xl">
            {j.image_url && <img src={mediaUrl(j.image_url)} alt="" loading="lazy" className="aspect-[3/2] w-full rounded-[30px] object-cover" />}
            <h3 className="mt-6 text-center text-xl text-ink">{j.title}</h3>
            <p className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-base text-ink/60">{j.qualification && <span className="flex items-center gap-2"><Brief className="h-4 w-4 text-ink" />{j.qualification}</span>}{j.location && <span className="flex items-center gap-2"><Pin className="h-4 w-4 text-ink" />{j.location}</span>}</p>
            {(j.department || j.employment_type) && <p className="mt-2 text-center text-sm text-ink/50">{[j.department, j.employment_type].filter(Boolean).join(' · ')}</p>}
            {j.intro && <p className="mt-4 line-clamp-3 text-sm text-ink/70">{j.intro}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3"><Link to={`/career-form/${j.slug}`} className="rounded-sm border border-teal py-2.5 text-center text-base font-medium text-teal transition hover:bg-mist">View Details</Link>
              <Link to={`/career-form/${j.slug}#apply`} className="rounded-sm bg-teal py-2.5 text-center text-base font-medium text-white transition hover:bg-teal-dark">Apply Now</Link></div></article>))}</div>}
    </Reveal></section>
    <Sec id="apply"><div className="mx-auto max-w-2xl text-center"><h2 className="mb-8 text-4xl font-bold text-teal md:text-5xl">Connect With Us for Future Opportunities</h2>
      <Form type="career" square center button="Submit application" success="Application received. We’ll be in touch." fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email Address', type: 'email', required: true }, { name: 'phone', label: 'Mobile Number', required: true },
        { name: 'experience', label: 'Years of Experience', type: 'select', options: ['0–1', '1–3', '3–5', '5–10', '10+'], required: true },
        { name: 'resume', label: `Upload Resume (PDF or DOCX, maximum ${LIMITS.resumeMb} MB)`, type: 'file', maxMb: LIMITS.resumeMb, wide: true, required: true }]} /></div></Sec></Page>)
}

export default Careers
