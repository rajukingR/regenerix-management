// Browser push through Firebase Cloud Messaging (HTTP v1). No extra package: the service-account JWT is signed with jsonwebtoken and sent with Node's fetch.
// Credentials: backend/firebase-service-account.json (or the path in FIREBASE_SERVICE_ACCOUNT), or the whole JSON in FIREBASE_SERVICE_ACCOUNT_JSON for hosts without a disk.
// If neither is present push is simply off: in-app notifications keep working and nothing here throws.
const fs = require('fs'), path = require('path'), jwt = require('jsonwebtoken');
const db = require('./db');

let account; // undefined = not looked up yet, null = not configured
const load = () => {
  if (account !== undefined) return account;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || fs.readFileSync(path.resolve(__dirname, '../..', process.env.FIREBASE_SERVICE_ACCOUNT || 'firebase-service-account.json'), 'utf8');
    const a = JSON.parse(raw); account = a.private_key && a.client_email && a.project_id ? a : null;
  } catch { account = null; }
  console.log(account ? `Push notifications: on (Firebase project ${account.project_id})` : 'Push notifications: off (no Firebase service account found)');
  return account;
};
exports.enabled = () => !!load();

let cached = { token: null, until: 0 };
async function accessToken(a) {
  if (cached.token && Date.now() < cached.until) return cached.token;
  const uri = a.token_uri || 'https://oauth2.googleapis.com/token';
  const assertion = jwt.sign({ scope: 'https://www.googleapis.com/auth/firebase.messaging' }, a.private_key, { algorithm: 'RS256', issuer: a.client_email, audience: uri, expiresIn: 3600 });
  const res = await fetch(uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw new Error(`Google rejected the service account (${res.status}): ${d.error_description || d.error || 'no token returned'}`);
  cached = { token: d.access_token, until: Date.now() + (Number(d.expires_in || 3600) - 300) * 1000 };
  return cached.token;
}

const TITLES = { appointment_booking: 'New appointment booking', appointment_assigned: 'Appointment assigned to you', appointment_unassigned: 'Appointment reassigned', appointment_update: 'Appointment update', appointment_updated: 'Appointment update',
  appointment_booked: 'Appointment booked', doctor_update: 'Doctor updated an appointment', job_application: 'New job application', application_status: 'Job application update', test: 'Push notifications are working' };
// Where a click on the notification lands, per portal
const link = (portal, type, d = {}) => {
  if (portal !== 'admin') return `/${portal}/notifications`;
  if (type === 'job_application') return d.application_id ? `/admin/applications?open=${d.application_id}` : '/admin/applications';
  if (/appointment|doctor_update/.test(type)) return d.appointment_id ? `/admin/appointments?open=${d.appointment_id}` : '/admin/appointments';
  return '/admin';
};

// Sends one data message per registered browser. Returns { sent, failed, removed }. Never throws.
exports.send = async (audience, userIds, { type = '', message = '', detail = {} } = {}) => {
  const out = { sent: 0, failed: 0, removed: 0 }, a = load();
  if (!a || !userIds || !userIds.length) return out;
  try {
    const rows = await db('push_tokens').where({ audience }).whereIn('user_id', userIds);
    if (!rows.length) return out;
    const bearer = await accessToken(a);
    await Promise.all(rows.map(async (r) => {
      try {
        // Data-only, so the service worker decides how it is shown (works the same on localhost and in production).
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { token: r.token, data: { title: TITLES[type] || 'Regenerix', body: String(message).slice(0, 500), url: link(r.portal, type, detail), type: String(type), tag: `${type}-${detail.appointment_id || detail.application_id || Date.now()}` },
            webpush: { headers: { Urgency: 'high', TTL: '86400' } } } }) });
        if (res.ok) { out.sent += 1; return; }
        const e = await res.json().catch(() => ({})), code = e.error?.details?.find((x) => x.errorCode)?.errorCode || e.error?.status;
        if (res.status === 404 || code === 'UNREGISTERED') { await db('push_tokens').where({ id: r.id }).del(); out.removed += 1; } // the browser dropped this subscription
        else { out.failed += 1; out.error = e.error?.message || `FCM error ${res.status}`; console.warn('Push not delivered:', out.error); }
      } catch (e) { out.failed += 1; out.error = e.message; }
    }));
  } catch (e) { out.error = e.message; console.warn('Push skipped:', e.message); }
  return out;
};
