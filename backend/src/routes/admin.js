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
const clinic = require('../controllers/clinic');
const receipts = require('../controllers/receipts');
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
// Clinic management: patients, consultations, treatments (+ visit entries), payments / receipts, dues, expenses, reports
r.get('/clinic/options', clinic.options); r.get('/clinic/summary', clinic.summary); r.get('/clinic/reports', clinic.reports); r.get('/clinic/dues', clinic.dues);
r.get('/clinic/patients', clinic.patients); r.post('/clinic/patients', clinic.patientCreate); r.get('/clinic/patients/:id', clinic.patientGet);
r.put('/clinic/patients/:id', clinic.patientUpdate); r.delete('/clinic/patients/:id', clinic.patientRemove); r.get('/clinic/patients/:id/dues', clinic.patientDues);
r.get('/clinic/consultations', clinic.consultations); r.post('/clinic/consultations', clinic.consultationCreate); r.get('/clinic/consultations/:id', clinic.consultationGet);
r.put('/clinic/consultations/:id', clinic.consultationUpdate); r.delete('/clinic/consultations/:id', clinic.consultationRemove);
r.get('/clinic/treatments', clinic.treatments); r.post('/clinic/treatments', clinic.treatmentCreate); r.get('/clinic/treatments/:id', clinic.treatmentGet);
r.put('/clinic/treatments/:id', clinic.treatmentUpdate); r.delete('/clinic/treatments/:id', clinic.treatmentRemove);
r.post('/clinic/treatments/:id/visits', clinic.visitCreate); r.delete('/clinic/treatments/:id/visits/:vid', clinic.visitRemove);
r.get('/clinic/payments', clinic.payments); r.post('/clinic/payments', clinic.paymentCreate); r.get('/clinic/payments/:id', clinic.paymentGet); r.delete('/clinic/payments/:id', clinic.paymentRemove);
// Send a receipt to the patient: PDF, email (PDF attached), WhatsApp link
r.get('/clinic/payments/:id/pdf', receipts.pdf); r.get('/clinic/payments/:id/share', receipts.share); r.post('/clinic/payments/:id/email', receipts.email);
r.get('/clinic/expenses', clinic.expenses); r.post('/clinic/expenses', clinic.expenseCreate); r.put('/clinic/expenses/:id', clinic.expenseUpdate); r.delete('/clinic/expenses/:id', clinic.expenseRemove);
// Notifications (always scoped to the logged-in admin)
notif.mount(r);
require('../controllers/push').mount(r, 'admin'); // browser push: status / register / unregister / test
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
