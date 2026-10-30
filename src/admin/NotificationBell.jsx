import { api } from './api.js'
import Bell, { parse } from '../portal/Bell.jsx'

export const target = (n) => {
  const d = parse(n.detail)
  if (['appointment_booking', 'doctor_update'].includes(n.message_type)) return d.appointment_id ?? d.id ? `/admin/appointments?open=${d.appointment_id ?? d.id}` : '/admin/appointments'
  if (n.message_type === 'job_application') return d.application_id ?? d.id ? `/admin/applications?open=${d.application_id ?? d.id}` : '/admin/applications'
  return '/admin'
}

export default function NotificationBell() { return <Bell api={api} base="/admin" target={target} /> }
