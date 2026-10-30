const r = require('express').Router();
const m = require('../models');
const { requireAdmin } = require('../config/auth');
const { crud } = require('../controllers/crud');
const media = require('../controllers/media');
const misc = require('../controllers/misc');
const appt = require('../controllers/appointments');
const apps = require('../controllers/applications');
const notif = require('../controllers/notifications');
const doctors = require('../controllers/doctors');
const members = require('../controllers/members');
const upload = require('../config/upload');
r.use(requireAdmin); // admin accounts only; doctor and member tokens get 401/403 here
// Generic CRUD: list / get / create / update / toggle(is_active) / delete
const RESOURCES = { 'nav-items': 'nav', pages: 'pages', sections: 'sections', services: 'services', packages: 'packages', testimonials: 'testimonials', team: 'team',
  stats: 'stats', why: 'why', journey: 'journey', faqs: 'faqs', blogs: 'blogs', jobs: 'jobs', messages: 'messages', subscribers: 'subscribers' };
// Appointments (paginated, filtered, slot-checked). PUT also takes { assigned_to } to assign a doctor.
r.get('/appointments/assignable', appt.assignable);
r.get('/appointments', appt.adminList); r.get('/appointments/:id', appt.adminGet); r.put('/appointments/:id', appt.adminUpdate); r.delete('/appointments/:id', appt.adminRemove);
// Job applications. PUT { status, note? } notifies the applicant's member account.
r.get('/applications', apps.list); r.get('/applications/:id', apps.get); r.put('/applications/:id', apps.update); r.delete('/applications/:id', apps.remove);
r.get('/applications/:id/resume', misc.resume);
// Doctor logins + member accounts
r.get('/doctors', doctors.list); r.post('/doctors', doctors.create); r.put('/doctors/:id', doctors.update); r.delete('/doctors/:id', doctors.remove);
r.get('/members', members.adminList); r.patch('/members/:id/toggle', members.adminToggle);
// Notifications (always scoped to the logged-in admin)
notif.mount(r);
r.get('/dashboard', misc.dashboard);
r.get('/settings', misc.settingsGet);
r.put('/settings', misc.settingsPut);
r.get('/media', media.list);
r.post('/media', upload.media.array('files', 10), media.upload);
r.delete('/media/:id', media.remove);
for (const [path, key] of Object.entries(RESOURCES)) {
  const c = crud(m[key]);
  r.get(`/${path}`, c.list); r.post(`/${path}`, c.create); r.get(`/${path}/:id`, c.get);
  r.put(`/${path}/:id`, c.update); r.patch(`/${path}/:id/toggle`, c.toggle); r.delete(`/${path}/:id`, c.remove);
}
module.exports = r;
