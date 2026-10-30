// Doctor dashboard API: /api/doctor/*  (doctor logins only; every query is limited to appointments assigned to them)
const r = require('express').Router();
const { requireDoctor } = require('../config/auth');
const appt = require('../controllers/appointments');
const notif = require('../controllers/notifications');
r.use(requireDoctor);
r.get('/dashboard', appt.doctorDashboard);
r.get('/appointments', appt.doctorList);            // ?page&limit&q&status&date_from&date_to&when=today|upcoming
r.get('/appointments/:id', appt.doctorGet);
r.put('/appointments/:id', appt.doctorUpdate);      // { status: 'completed' | 'rejected', note }
notif.mount(r);
module.exports = r;
