const db = require('../config/db');
const shape = (r) => {
  if (!r) return r;
  if (typeof r.detail === 'string') { try { r.detail = JSON.parse(r.detail); } catch { r.detail = null; } }
  r.is_read = r.is_read ? 1 : 0; return r;
};
// audience 'staff' -> user_id is admins.id (admin or doctor); audience 'member' -> user_id is members.id
const rows = (ids, audience, type, message, detail, photo) => ids.map((id) => ({ user_id: id, audience, message, message_type: type, is_read: 0, detail: JSON.stringify(detail || {}), photo }));

// All notify* helpers are called INSIDE the transaction that saves the record, so a notification exists if and only if the change was saved.
exports.notifyAdmins = async (trx, type, message, detail, photo = null) => {
  const admins = await trx('admins').where({ role: 'admin' }).where((q) => q.where({ is_active: 1 }).orWhereNull('is_active')).select('id'); // every admin account; nothing is hard-coded
  if (admins.length) await trx('notifications').insert(rows(admins.map((a) => a.id), 'staff', type, message, detail, photo));
};
// Every active doctor login linked to this team member
exports.notifyDoctor = async (trx, teamId, type, message, detail, photo = null) => {
  if (!teamId) return;
  const docs = await trx('admins').where({ role: 'doctor', team_id: teamId }).where((q) => q.where({ is_active: 1 }).orWhereNull('is_active')).select('id');
  if (docs.length) await trx('notifications').insert(rows(docs.map((a) => a.id), 'staff', type, message, detail, photo));
};
exports.notifyMember = async (trx, memberId, type, message, detail, photo = null) => {
  if (!memberId) return;
  await trx('notifications').insert(rows([memberId], 'member', type, message, detail, photo));
};

const mine = (userId, audience) => db('notifications').where({ user_id: userId, audience });
exports.listFor = async (userId, limit, audience = 'staff') => (await mine(userId, audience).orderBy('id', 'desc').limit(limit)).map(shape);
exports.unread = async (userId, audience = 'staff') => Number((await mine(userId, audience).where({ is_read: 0 }).count({ c: '*' }).first()).c);
exports.markRead = async (id, userId, audience = 'staff') => { // only the owner's row is touched; anyone else's id looks like "not found"
  const row = await mine(userId, audience).where({ id }).first(); if (!row) return null;
  if (!row.is_read) await db('notifications').where({ id }).update({ is_read: 1 }); return shape({ ...row, is_read: 1 });
};
exports.markAllRead = (userId, audience = 'staff') => mine(userId, audience).where({ is_read: 0 }).update({ is_read: 1 });
