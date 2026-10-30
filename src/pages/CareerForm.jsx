import { Link, useParams } from 'react-router-dom'
import { useData } from '../siteContext.jsx'
import { Form } from '../components/ui.jsx'
import { Check, Chevrons } from '../components/icons.jsx'
import { Page, Sec } from '../components/Page.jsx'

const Tick = () => <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-ink text-ink"><Check className="h-3 w-3" /></span>
const List = ({ items }) => <ul className="mb-8 mt-3 space-y-3">{items.map((x) => <li key={x} className="flex items-start gap-3 text-sm text-ink/70"><Tick />{x}</li>)}</ul>
const day = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '')

const CareerForm = () => {
  const { slug } = useParams(); const { JOBS, LIMITS } = useData(); const job = JOBS.find((j) => j.slug === slug)
  if (!job) return (<Page title="Career Form"><Sec><div className="mx-auto max-w-md text-center"><h2 className="text-3xl text-teal">This job is no longer available</h2><p className="mt-3 text-ink/70">It may have been filled or closed. See our current openings.</p><Link to="/careers" className="btn mt-6">View open positions</Link></div></Sec></Page>)
  const details = [['Posted', day(job.posted_on)], ['Expiration', day(job.expires_on)], ['Location', job.location], ['Department', job.department], ['Employment type', job.employment_type], ['Category', job.category], ['Salary', job.salary], ['Experience', job.experience], ['Gender', job.gender]].filter(([, v]) => v)
  return (<Page title="Career Form">
    <Sec><div className="mb-14 text-center"><h2 className="mx-auto max-w-md text-4xl font-bold leading-tight text-[#0F2E24] md:text-6xl">{job.title}</h2>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink/60"><Link to="/">Home</Link><Chevrons className="h-3 w-3" /><Link to="/careers">Jobs</Link></p></div>
      <div className="grid gap-12 md:grid-cols-[1.7fr_1fr]">
        <div>{job.intro && <><h3 className="text-base font-semibold">Job Description</h3><p className="mb-8 mt-2 text-sm leading-7 text-ink/70">{job.intro}</p></>}
          {job.responsibilities.length > 0 && <><h3 className="text-base font-semibold">Responsibility</h3><List items={job.responsibilities} /></>}
          {job.requirements.length > 0 && <><h3 className="text-base font-semibold">Requirements</h3><List items={job.requirements} /></>}</div>
        <aside><h3 className="mb-4 text-sm font-semibold">Job Details</h3><dl className="space-y-4 text-sm">{details.map(([k, v]) => (<div key={k} className="flex items-center justify-between gap-4"><dt className="flex items-center gap-3"><span className="h-3.5 w-3.5 rounded-sm border border-ink" />{k}:</dt><dd className="text-right text-ink/60">{v}</dd></div>))}</dl></aside></div></Sec>
    <Sec id="apply"><div className="mx-auto max-w-3xl text-center"><h2 className="mb-8 text-4xl text-teal">Start Your Application</h2>
      <Form type="career" extra={{ job_id: job.id }} square center button="Submit application" success="Application received. We’ll be in touch." fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email Address', type: 'email', required: true }, { name: 'phone', label: 'Mobile Number', required: true },
        { name: 'experience', label: 'Years of Experience', type: 'select', options: ['0–1', '1–3', '3–5', '5–10', '10+'], required: true },
        { name: 'cover_letter', label: 'Cover letter (optional)', type: 'textarea', wide: true },
        { name: 'resume', label: `Upload Resume (PDF or DOCX, maximum ${LIMITS.resumeMb} MB)`, type: 'file', maxMb: LIMITS.resumeMb, wide: true, required: true }]} /></div></Sec></Page>)
}

export default CareerForm
