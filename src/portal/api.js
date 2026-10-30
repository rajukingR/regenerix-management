import { apiUrl } from '../admin/api.js'

// One token per portal. The member token uses the same key the public website sends with its forms (src/lib/api.js),
// so a logged-in member's bookings and job applications are linked to their account automatically.
export const KEYS = { admin: 'rgx_token', doctor: 'rgx_doctor_token', member: 'regenerix_token' }
export const LOGIN = { admin: '/admin/login', doctor: '/doctor/login', member: '/member/login' }

const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
  del: (k) => { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}
export const getToken = (portal) => store.get(KEYS[portal])
export const setToken = (portal, t) => store.set(KEYS[portal], t)
export const clearToken = (portal) => store.del(KEYS[portal])

// Reads the token payload for routing only (the server checks every request).
export const tokenInfo = (t) => {
  try { const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return p.exp && p.exp * 1000 < Date.now() ? null : p } catch { return null }
}
export const loggedIn = (portal) => { const t = getToken(portal); const p = t && tokenInfo(t); if (t && !p) clearToken(portal); return p }

// api('/doctor/appointments') etc. 401 -> back to that portal's login page.
export const makeApi = (portal) => async (path, { method = 'GET', body } = {}) => {
  const headers = {}, t = getToken(portal)
  if (t) headers.Authorization = `Bearer ${t}`
  if (body != null) headers['Content-Type'] = 'application/json'
  let res
  try { res = await fetch(apiUrl(path), { method, headers, body: body != null ? JSON.stringify(body) : undefined }) } catch { throw new Error('Unable to reach the server. Please check your connection.') }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && !/\/auth\/(login|register)/.test(path)) { clearToken(portal); window.location.href = LOGIN[portal]; }
  if (!res.ok) { const e = new Error(data.message || 'Request failed'); e.status = res.status; throw e }
  return data
}
export const doctorApi = makeApi('doctor')
export const memberApi = makeApi('member')
