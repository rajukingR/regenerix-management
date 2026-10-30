const jwt = require('jsonwebtoken');
const db = require('./db');
const secret = () => { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set'); return process.env.JWT_SECRET; };
const expires = () => process.env.JWT_EXPIRES || '12h';
const bearer = (req) => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? h.slice(7) : null; };

// Staff = rows in `admins` (role 'admin' or 'doctor'). Members = rows in `members`. The token's `kind` keeps the two id spaces apart.
exports.sign = (a) => jwt.sign({ id: a.id, email: a.email, role: a.role || 'admin', kind: 'staff' }, secret(), { expiresIn: expires() });
exports.signMember = (m) => jwt.sign({ id: m.id, email: m.email, role: 'member', kind: 'member' }, secret(), { expiresIn: process.env.MEMBER_JWT_EXPIRES || '7d' });

// requireStaff(...roles): any staff account when no roles are given. The account is re-read on every request,
// so a disabled doctor or a changed role takes effect immediately instead of when the token expires.
exports.requireStaff = (...roles) => {
  return async (req, res, next) => {
    const t = bearer(req); if (!t) return res.status(401).json({ message: 'Login required' });
    let p; try { p = jwt.verify(t, secret()); } catch { return res.status(401).json({ message: 'Session expired, please log in again' }); }
    if (p.kind === 'member' || p.role === 'member') return res.status(401).json({ message: 'Login required' });
    try {
      const a = await db('admins').where({ id: p.id }).first();
      if (!a || a.is_active === 0 || a.is_active === false) return res.status(401).json({ message: 'Account not found or disabled' });
      const role = a.role || 'admin';
      if (roles.length && !roles.includes(role)) return res.status(403).json({ message: 'You do not have access to this area' });
      req.admin = { id: a.id, email: a.email, name: a.name, role, team_id: a.team_id || null }; next();
    } catch (e) { next(e); }
  };
};

exports.requireAuth = exports.requireStaff(); // any active staff account (admin or doctor)
exports.requireAdmin = exports.requireStaff('admin');
exports.requireDoctor = exports.requireStaff('doctor');

exports.requireMember = async (req, res, next) => {
  const t = bearer(req); if (!t) return res.status(401).json({ message: 'Login required' });
  let p; try { p = jwt.verify(t, secret()); } catch { return res.status(401).json({ message: 'Session expired, please log in again' }); }
  if (p.kind !== 'member') return res.status(401).json({ message: 'Login required' });
  try {
    const m = await db('members').where({ id: p.id }).first();
    if (!m || !m.is_active) return res.status(401).json({ message: 'Account not found or disabled' });
    req.member = { id: m.id, email: m.email, name: m.name, phone: m.phone }; next();
  } catch (e) { next(e); }
};

// Public forms: if a valid member token is sent, attach the member so the booking / application is linked to the account. Never fails the request.
exports.optionalMember = async (req, res, next) => {
  const t = bearer(req); if (!t) return next();
  try {
    const p = jwt.verify(t, secret());
    if (p.kind === 'member') { const m = await db('members').where({ id: p.id }).first(); if (m && m.is_active) req.member = { id: m.id, email: m.email, name: m.name, phone: m.phone }; }
  } catch { /* anonymous */ }
  next();
};
