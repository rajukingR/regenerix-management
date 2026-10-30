const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signMember } = require('../config/auth');
const { claim, digits } = require('../models/members');
const appt = require('./appointments');
const apps = require('./applications');
const N = require('../models/notifications');
const { wrap } = require('./crud');
const { clean, isEmail, phoneOk } = require('../config/util');
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const safe = (m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, created_at: m.created_at });

// ---------- member self-service ----------
exports.register = wrap(async (req, res) => {
  const b = req.body || {}, name = clean(b.name, 120), email = clean(b.email, 190).toLowerCase(), phone = clean(b.phone, 30), password = String(b.password || '');
  if (!name || !isEmail(email) || !phoneOk(phone)) return bad(res, 'Enter your name, a valid email and a valid mobile number');
  if (password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (await db('members').whereRaw('lower(email) = ?', [email]).first()) return bad(res, 'An account with this email already exists. Please log in.', 409);
  const [id] = await db('members').insert({ name, email, phone, password: await bcrypt.hash(password, 12), last_login_at: db.fn.now() });
  const m = await db('members').where({ id }).first();
  const linked = await claim(m); // earlier bookings / applications with the same email AND phone
  res.status(201).json({ success: true, token: signMember(m), member: safe(m), linked });
});
exports.login = wrap(async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const m = await db('members').whereRaw('lower(email) = ?', [String(email).trim().toLowerCase()]).first();
  if (!m || !(await bcrypt.compare(String(password), m.password))) return bad(res, 'Invalid email or password', 401);
  if (!m.is_active) return bad(res, 'This account has been disabled. Please contact us.', 403);
  await db('members').where({ id: m.id }).update({ last_login_at: db.fn.now() });
  const linked = await claim(m);
  res.json({ success: true, token: signMember(m), member: safe(m), linked });
});
exports.me = wrap(async (req, res) => res.json({ success: true, member: safe(await db('members').where({ id: req.member.id }).first()) }));
exports.updateMe = wrap(async (req, res) => {
  const b = req.body || {}, name = clean(b.name, 120), phone = clean(b.phone, 30);
  if (!name || !phoneOk(phone)) return bad(res, 'Enter your name and a valid mobile number');
  await db('members').where({ id: req.member.id }).update({ name, phone, updated_at: db.fn.now() });
  const m = await db('members').where({ id: req.member.id }).first();
  if (digits(phone) !== digits(req.member.phone)) await claim(m);
  res.json({ success: true, member: safe(m) });
});
exports.changePassword = wrap(async (req, res) => {
  const { current = '', next = '' } = req.body || {};
  const m = await db('members').where({ id: req.member.id }).first();
  if (!(await bcrypt.compare(String(current), m.password))) return bad(res, 'Current password is incorrect');
  if (String(next).length < 8) return bad(res, 'New password must be at least 8 characters');
  await db('members').where({ id: m.id }).update({ password: await bcrypt.hash(String(next), 12), updated_at: db.fn.now() });
  res.json({ success: true });
});
exports.dashboard = wrap(async (req, res) => {
  const [a, j, unread, recent] = await Promise.all([appt.memberCounts(req.member.id), apps.memberCounts(req.member.id), N.unread(req.member.id, 'member'), N.listFor(req.member.id, 5, 'member')]);
  res.json({ success: true, appointments: a, applications: j, unread_count: unread, notifications: recent });
});

// ---------- admin: member list ----------
exports.adminList = wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)), q = String(req.query.q || '').trim();
  const base = () => { const x = db('members as m'); if (q) x.where((w) => ['m.name', 'm.email', 'm.phone'].forEach((c) => w.orWhere(c, 'like', `%${q}%`))); return x; };
  const total = Number((await base().count({ c: 'm.id' }).first()).c);
  const data = await base().select('m.id', 'm.name', 'm.email', 'm.phone', 'm.is_active', 'm.created_at', 'm.last_login_at',
    db('appointments').count('*').where('member_id', db.ref('m.id')).as('appointments'), db('career_applications').count('*').where('member_id', db.ref('m.id')).as('applications'))
    .orderBy('m.id', 'desc').limit(limit).offset((page - 1) * limit);
  res.json({ success: true, data: data.map((r) => ({ ...r, is_active: !!r.is_active, appointments: Number(r.appointments), applications: Number(r.applications) })), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
exports.adminToggle = wrap(async (req, res) => {
  const m = await db('members').where({ id: req.params.id }).first(); if (!m) return bad(res, 'Not found', 404);
  await db('members').where({ id: m.id }).update({ is_active: m.is_active ? 0 : 1, updated_at: db.fn.now() });
  res.json({ success: true, is_active: !m.is_active });
});
