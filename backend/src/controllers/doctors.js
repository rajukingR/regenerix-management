// Admin management of doctor logins. A doctor login is an `admins` row with role 'doctor', linked to one team member (team_id).
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { wrap } = require('./crud');
const { clean, isEmail } = require('../config/util');
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const OPEN = ['pending', 'confirmed', 'rescheduled'];

// Every team member, with their login (if any) and how many appointments they hold
exports.list = wrap(async (req, res) => {
  const team = await db('team_members').select('id', 'name', 'role', 'image_url', 'is_active').orderBy([{ column: 'sort_order' }, { column: 'id' }]);
  const logins = await db('admins').where({ role: 'doctor' }).select('id', 'name', 'email', 'phone', 'team_id', 'is_active', 'created_at');
  const counts = await db('appointments').whereNotNull('assigned_to').groupBy('assigned_to')
    .select('assigned_to', db.raw(`count(*) as total, sum(case when status in (${OPEN.map(() => '?').join(',')}) then 1 else 0 end) as open_count, sum(case when status = 'completed' then 1 else 0 end) as completed_count`, OPEN));
  const by = Object.fromEntries(counts.map((c) => [c.assigned_to, c]));
  res.json({ success: true, data: team.map((t) => {
    const l = logins.find((x) => x.team_id === t.id), c = by[t.id] || {};
    return { team_id: t.id, name: t.name, role: t.role, image_url: t.image_url, team_active: !!t.is_active,
      login: l ? { id: l.id, email: l.email, phone: l.phone, is_active: l.is_active === null || l.is_active === undefined ? true : !!l.is_active, created_at: l.created_at } : null,
      appointments: { total: Number(c.total || 0), open: Number(c.open_count || 0), completed: Number(c.completed_count || 0) } };
  }) });
});
// body: { team_id, email, password, phone? }
exports.create = wrap(async (req, res) => {
  const b = req.body || {}, email = clean(b.email, 190).toLowerCase(), password = String(b.password || '');
  const t = await db('team_members').where({ id: Number(b.team_id) }).first();
  if (!t) return bad(res, 'Choose a team member');
  if (!isEmail(email)) return bad(res, 'Enter a valid email');
  if (password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (await db('admins').where({ role: 'doctor', team_id: t.id }).first()) return bad(res, `${t.name} already has a login`, 409);
  if (await db('admins').where({ email }).first()) return bad(res, 'That email is already used by another login', 409);
  const [id] = await db('admins').insert({ name: t.name, email, phone: clean(b.phone, 30) || null, password: await bcrypt.hash(password, 12), role: 'doctor', team_id: t.id, is_active: 1 });
  res.status(201).json({ success: true, id });
});
// body: { email?, password?, phone?, is_active? }
exports.update = wrap(async (req, res) => {
  const d = await db('admins').where({ id: req.params.id, role: 'doctor' }).first(); if (!d) return bad(res, 'Not found', 404);
  const b = req.body || {}, upd = {};
  if (b.email !== undefined) {
    const email = clean(b.email, 190).toLowerCase(); if (!isEmail(email)) return bad(res, 'Enter a valid email');
    if (await db('admins').where({ email }).whereNot({ id: d.id }).first()) return bad(res, 'That email is already used by another login', 409);
    upd.email = email;
  }
  if (b.password) { if (String(b.password).length < 8) return bad(res, 'Password must be at least 8 characters'); upd.password = await bcrypt.hash(String(b.password), 12); }
  if (b.phone !== undefined) upd.phone = clean(b.phone, 30) || null;
  if (b.is_active !== undefined) upd.is_active = b.is_active ? 1 : 0;
  if (Object.keys(upd).length) await db('admins').where({ id: d.id }).update({ ...upd, updated_at: db.fn.now() });
  res.json({ success: true });
});
// Removes the login only. The team member and their appointment history stay.
exports.remove = wrap(async (req, res) => {
  const n = await db('admins').where({ id: req.params.id, role: 'doctor' }).del();
  n ? res.json({ success: true }) : bad(res, 'Not found', 404);
});
