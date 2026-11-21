// Browser push notifications (Firebase Cloud Messaging), shared by the admin, doctor and member portals.
// Firebase is loaded only when push is actually used, so it adds nothing to the public website's bundle.
// These are the web app's public identifiers from the Firebase console, not secrets. Override them with VITE_FIREBASE_* if the project changes
// (and update public/firebase-messaging-sw.js to match).
const env = import.meta.env
const CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCmUSRJNlIcI2k9FkXq_xS-9ujB9uXbwog',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'push-notification-625ed.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'push-notification-625ed',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'push-notification-625ed.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID || '205908355450',
  appId: env.VITE_FIREBASE_APP_ID || '1:205908355450:web:6ca52565eaaeb55f164ec3',
}
const VAPID = env.VITE_FIREBASE_VAPID_KEY || 'BDJqESe65YjYN_Jzptg_j1hMCHnTz037EczmnKQvmupLGigPWd6c3Xo0ax1q6f_-Ano1sS6VQ5GtHhvzkOdE-1w'

const key = (base) => `rgx_push${base.replace(/\//g, '_')}` // remembers the token this browser registered for a portal
const store = { get: (k) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }, del: (k) => { try { localStorage.removeItem(k) } catch { /* private mode */ } } }

// Push needs a service worker, the Push API and HTTPS (localhost counts as secure).
export const pushSupported = () => typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const pushPermission = () => (pushSupported() ? Notification.permission : 'unsupported') // default | granted | denied | unsupported
export const pushActive = (base) => pushPermission() === 'granted' && !!store.get(key(base))

let ready = null, listening = false
function firebase() {
  ready ||= (async () => {
    const [{ initializeApp, getApps }, m] = await Promise.all([import('firebase/app'), import('firebase/messaging')])
    if (!(await m.isSupported())) throw new Error('This browser does not support push notifications')
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    return { m, reg, messaging: m.getMessaging(getApps()[0] || initializeApp(CONFIG)) }
  })()
  ready.catch(() => { ready = null }) // allow a retry after a failure
  return ready
}

// Gets this browser's token and makes sure the server has it for the signed-in account.
async function sync(api, base) {
  const { m, reg, messaging } = await firebase()
  const token = await m.getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: reg })
  if (!token) throw new Error('The browser did not return a push token')
  await api(`${base}/push/register`, { method: 'POST', body: { token } })
  store.set(key(base), token)
  if (!listening) { // tab is open: refresh the bell at once and still show the system notification
    listening = true
    m.onMessage(messaging, (payload) => {
      const d = payload.data || {}
      window.dispatchEvent(new Event('NEW_NOTIFICATION'))
      reg.showNotification(d.title || 'Regenerix', { body: d.body || '', tag: d.tag || undefined, data: { url: d.url || '/' } }).catch(() => {})
    })
  }
  return token
}

// Called from a click: asks the browser for permission, then registers this browser.
export async function enablePush(api, base) {
  if (!pushSupported()) throw new Error('This browser does not support push notifications (the site must be opened over HTTPS)')
  const p = await Notification.requestPermission()
  if (p !== 'granted') throw new Error(p === 'denied' ? 'Notifications are blocked for this site. Allow them from the lock icon in the address bar, then try again.' : 'Permission was not given')
  return sync(api, base)
}
// Called on page load: if this browser was already switched on for this portal, keep its token fresh. Never prompts.
export async function resumePush(api, base) { if (pushActive(base)) { try { await sync(api, base) } catch { /* offline or push not configured: the in-app bell still works */ } } }
// Stops pushes to this browser for this portal (the permission itself stays, so it can be turned back on with one click).
export async function disablePush(api, base) {
  const token = store.get(key(base)); store.del(key(base))
  if (token) { try { await api(`${base}/push/unregister`, { method: 'POST', body: { token } }) } catch { /* already gone */ } }
}
// Call just before clearing the login token on logout, so a signed-out browser stops receiving that account's notifications.
export const pushLogout = (api, base) => { disablePush(api, base) }
