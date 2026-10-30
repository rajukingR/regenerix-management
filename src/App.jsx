import AdminLayout from './admin/AdminLayout.jsx'
import Login from './admin/Login.jsx'
import Dashboard from './admin/Dashboard.jsx'
import ResourcePage from './admin/ResourcePage.jsx'
import MediaLibrary from './admin/MediaLibrary.jsx'
import Settings from './admin/Settings.jsx'
import Inbox from './admin/Inbox.jsx'
import Appointments from './admin/Appointments.jsx'
import Applications from './admin/Applications.jsx'
import Doctors from './admin/Doctors.jsx'
import Members from './admin/Members.jsx'
import { MemberLogin, StaffLogin } from './portal/Login.jsx'
import { DoctorAppointments, DoctorHome, DoctorLayout, DoctorNotifications, DoctorProfile } from './doctor/Doctor.jsx'
import { MemberApplications, MemberAppointments, MemberBook, MemberHome, MemberLayout, MemberNotifications, MemberProfile } from './member/Member.jsx'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { SiteProvider, useData, useSite } from './siteContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Services from './pages/Services.jsx'
import ServiceDetail from './pages/ServiceDetail.jsx'
import Careers from './pages/Careers.jsx'
import CareerForm from './pages/CareerForm.jsx'
import Blogs from './pages/Blogs.jsx'
import BlogPost from './pages/BlogPost.jsx'
import Contact from './pages/Contact.jsx'
import Team from './pages/Team.jsx'
import FaqPage from './pages/Faqs.jsx'
import Policy from './pages/Policy.jsx'
import NotFound from './pages/NotFound.jsx'

// Shows a 404 when the page has been switched off (or removed) in the admin dashboard.
function Gate({ slug, children }) {
  const { pages } = useSite()
  return pages && !pages.some((p) => p.slug === slug) ? <NotFound /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="applications" element={<Applications />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="members" element={<Members />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="settings" element={<Settings />} />
        <Route path="inbox/:kind" element={<Inbox />} />
        <Route path=":resource" element={<ResourcePage />} />
      </Route>
      {/* Doctor portal: appointments the admin assigned to them */}
      <Route path="/doctor/login" element={<StaffLogin portal="doctor" />} />
      <Route path="/doctor" element={<DoctorLayout />}>
        <Route index element={<DoctorHome />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="notifications" element={<DoctorNotifications />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>
      {/* Member portal: patients and job applicants */}
      <Route path="/member/login" element={<MemberLogin />} />
      <Route path="/member" element={<MemberLayout />}>
        <Route index element={<MemberHome />} />
        <Route path="appointments" element={<MemberAppointments />} />
        <Route path="book" element={<MemberBook />} />
        <Route path="applications" element={<MemberApplications />} />
        <Route path="notifications" element={<MemberNotifications />} />
        <Route path="profile" element={<MemberProfile />} />
      </Route>
      <Route path="/login" element={<Navigate to="/member/login" replace />} />
      <Route element={<SiteProvider><Layout /></SiteProvider>}>
        <Route path="/" element={<Gate slug="home"><Home /></Gate>} />
        <Route path="/about" element={<Gate slug="about"><About /></Gate>} />
        <Route path="/service" element={<Gate slug="service"><Services /></Gate>} />
        <Route path="/careers" element={<Gate slug="careers"><Careers /></Gate>} />
        <Route path="/career-form" element={<Navigate to="/careers" replace />} />
        <Route path="/career-form/:slug" element={<Gate slug="career-form"><CareerForm /></Gate>} />
        <Route path="/blogs" element={<Gate slug="blogs"><Blogs /></Gate>} />
        <Route path="/contact-us" element={<Gate slug="contact-us"><Contact /></Gate>} />
        <Route path="/team-detail" element={<Gate slug="team-detail"><Team /></Gate>} />
        <Route path="/faqs" element={<Gate slug="faqs"><FaqPage /></Gate>} />
        {['privacy-policy', 'terms-and-condition', 'refund-and-returns-policy'].map((p) => <Route key={p} path={`/${p}`} element={<Gate slug={p}><Policy slug={p} /></Gate>} />)}
        <Route path="/:slug" element={<SlugRouter />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function SlugRouter() {
  const { slug } = useParams(); const { SERVICES, BLOGS } = useData()
  if (SERVICES.some((s) => s.slug === slug)) return <ServiceDetail slug={slug} />
  if (BLOGS.some((b) => b.slug === slug)) return <BlogPost slug={slug} />
  return <NotFound />
}
