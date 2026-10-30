const db = require('../config/db');
// Phone numbers are typed many ways (+91 98450 12345, 098450-12345 ...). Compare the last 10 digits.
const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
exports.digits = digits;
const sameEmail = (q, col, email) => q.whereRaw(`lower(${col}) = ?`, [String(email || '').toLowerCase()]);

// The member account that owns this email AND phone, or null. Used to link bookings / applications made while logged out.
// Matching both stops someone from registering with another person's email and reading their records.
exports.ownerId = async (trx, email, phone) => {
  const m = await sameEmail((trx || db)('members'), 'email', email).where({ is_active: 1 }).first();
  return m && digits(m.phone) && digits(m.phone) === digits(phone) ? m.id : null;
};

// Link earlier records (same email and same phone, not yet linked) to this member. Returns how many were linked.
exports.claim = async (member) => {
  let n = 0;
  for (const table of ['appointments', 'career_applications']) {
    const rows = await sameEmail(db(table), 'email', member.email).whereNull('member_id').select('id', 'phone');
    const ids = rows.filter((r) => digits(r.phone) === digits(member.phone)).map((r) => r.id);
    if (ids.length) n += await db(table).whereIn('id', ids).whereNull('member_id').update({ member_id: member.id });
  }
  return n;
};
