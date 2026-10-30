import { useData } from '../siteContext.jsx'
import { Accordion } from '../components/ui.jsx'
import { Page, Sec } from '../components/Page.jsx'
import { Empty } from '../components/State.jsx'

const FaqPage = () => { const { FAQS } = useData(); return <Page title="Faqs"><Sec>{FAQS.length ? <Accordion items={FAQS} /> : <Empty>No questions have been added yet.</Empty>}</Sec></Page> }

export default FaqPage
