// Member dashboard API: /api/member/*  (people who book appointments / apply for jobs)
const r = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireMember } = require('../config/auth');
const mem = require('../controllers/members');
const appt = require('../controllers/appointments');
const apps = require('../controllers/applications');
const notif = require('../controllers/notifications');
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many attempts, please try again later' } });
r.post('/auth/register', authLimit, mem.register);
r.post('/auth/login', authLimit, mem.login);
r.use(requireMember);
r.get('/me', mem.me); r.put('/me', mem.updateMe); r.put('/password', mem.changePassword);
r.get('/dashboard', mem.dashboard);
r.get('/appointments', appt.memberList); r.get('/appointments/:id', appt.memberGet);
r.get('/applications', apps.memberList); r.get('/applications/:id', apps.memberGet);
notif.mount(r);
module.exports = r;
