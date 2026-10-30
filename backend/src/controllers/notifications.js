const N = require('../models/notifications');
const { wrap } = require('./crud');
// Same four endpoints for every portal. Staff (admin + doctor) read their own rows from req.admin, members from req.member.
const who = (req) => (req.member ? [req.member.id, 'member'] : [req.admin.id, 'staff']);
exports.list = wrap(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20)), [id, aud] = who(req);
  res.json({ success: true, notifications: await N.listFor(id, limit, aud), unread_count: await N.unread(id, aud) });
});
exports.unread = wrap(async (req, res) => { const [id, aud] = who(req); res.json({ success: true, unread_count: await N.unread(id, aud) }); });
exports.read = wrap(async (req, res) => {
  const [id, aud] = who(req), n = await N.markRead(Number(req.params.id), id, aud);
  n ? res.json({ success: true, notification: n, unread_count: await N.unread(id, aud) }) : res.status(404).json({ success: false, message: 'Notification not found' });
});
exports.readAll = wrap(async (req, res) => { const [id, aud] = who(req); await N.markAllRead(id, aud); res.json({ success: true, unread_count: 0 }); });
// Mounts the four routes on any router
exports.mount = (r) => { r.get('/notifications', exports.list); r.get('/notifications/unread-count', exports.unread); r.patch('/notifications/read-all', exports.readAll); r.patch('/notifications/:id/read', exports.read); };
