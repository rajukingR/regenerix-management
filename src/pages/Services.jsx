import { Reveal } from '../components/ui.jsx'
import { Page } from '../components/Page.jsx'
import { ServiceRows, Packages } from '../components/sections.jsx'

const Services = () => (<Page title="Service"><section className="mx-3 mt-16 rounded-2xl bg-mist py-6 md:mx-8"><Reveal className="wrap"><ServiceRows /></Reveal></section><Packages /></Page>)

export default Services
