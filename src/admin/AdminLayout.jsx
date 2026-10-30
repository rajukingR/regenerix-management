import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from './api.js'
import { CONTENT, RESOURCES } from './resources.js'
import NotificationBell from './NotificationBell.jsx'
import Shell from '../portal/Shell.jsx'
import { clearToken, getToken, setToken, tokenInfo } from '../portal/api.js'

const ICONS = { pages: 'file', 'nav-items': 'menu', sections: 'layers', services: 'steth', packages: 'brief', testimonials: 'mail', team: 'users', stats: 'trend', why: 'checkCircle', journey: 'right', faqs: 'alert', blogs: 'file', jobs: 'brief' }

export default function AdminLayout() {
  const nav = useNavigate(); const [me, setMe] = useState(null)
  const t = getToken('admin'), info = t && tokenInfo(t)
  useEffect(() => { if (info && info.role !== 'doctor') api('/auth/me').then(setMe).catch(() => {}) }, [t]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!info) { if (t) clearToken('admin'); return <Navigate to="/admin/login" replace /> }
  if (info.role === 'doctor') { setToken('doctor', t); clearToken('admin'); return <Navigate to="/doctor" replace /> } // doctor signed in on the admin page
  const groups = [
    { heading: 'Main menu', items: [{ to: '/admin', label: 'Dashboard', icon: 'grid', end: true }] },
    { heading: 'Appointments', items: [{ to: '/admin/appointments', label: 'Appointments', icon: 'calendar' }, { to: '/admin/doctors', label: 'Doctors', icon: 'steth' }] },
    { heading: 'Careers', items: [{ to: '/admin/applications', label: 'Job Applications', icon: 'file' }, { to: '/admin/jobs', label: 'Jobs', icon: 'brief' }] },
    { heading: 'People & inbox', items: [{ to: '/admin/members', label: 'Members', icon: 'users' }, { to: '/admin/inbox/messages', label: 'Messages', icon: 'mail' }, { to: '/admin/inbox/subscribers', label: 'Subscribers', icon: 'inbox' }] },
    { heading: 'Website content', items: CONTENT.filter((k) => k !== 'jobs').map((k) => ({ to: `/admin/${k}`, label: RESOURCES[k].title, icon: ICONS[k] })) },
    { heading: 'Site', items: [{ to: '/admin/media', label: 'Media library', icon: 'image' }, { to: '/', label: 'View website', icon: 'ext', external: true }] },
  ]
  return <Shell portal={{ key: 'admin', label: 'Admin' }} groups={groups} bottom={[{ to: '/admin/settings', label: 'Settings & account', icon: 'settings' }]}
    user={{ name: me?.name || 'Admin', sub: me?.email, to: '/admin/settings' }} title="Dashboard" bell={<NotificationBell />}
    onLogout={() => { clearToken('admin'); nav('/admin/login') }} />
}
