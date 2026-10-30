const bcrypt = require('bcryptjs');
const m = require('../models');
const { sign } = require('../config/auth');
const { wrap } = require('./crud');
// role tells the website which dashboard to open: 'admin' -> /admin, 'doctor' -> /doctor
const safe = (a, team) => ({ id: a.id, name: a.name, email: a.email, role: a.role || 'admin', team_id: a.team_id || null, phone: a.phone || null,
  team: team ? { id: team.id, name: team.name, role: team.role, image_url: team.image_url } : null });
const teamOf = (a) => (a.team_id ? m.team.find(a.team_id) : null);
exports.login = wrap(async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const a = await m.admins.findBy('email', String(email).trim().toLowerCase());
  // same message for unknown email and wrong password
  if (!a || !(await bcrypt.compare(String(password), a.password))) return res.status(401).json({ message: 'Invalid email or password' });
  if (a.is_active === 0 || a.is_active === false) return res.status(403).json({ message: 'This login has been disabled. Please contact the admin.' });
  res.json({ token: sign(a), admin: safe(a, await teamOf(a)) });
});
exports.me = wrap(async (req, res) => { const a = await m.admins.find(req.admin.id); a ? res.json(safe(a, await teamOf(a))) : res.status(401).json({ message: 'Account not found' }); });
exports.changePassword = wrap(async (req, res) => {
  const { current = '', next = '' } = req.body || {};
  const a = await m.admins.find(req.admin.id);
  if (!(await bcrypt.compare(String(current), a.password))) return res.status(400).json({ message: 'Current password is incorrect' });
  if (String(next).length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
  await m.admins.update(a.id, { password: await bcrypt.hash(String(next), 12) });
  res.json({ ok: true });
});
