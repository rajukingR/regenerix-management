const crypto = require('crypto');
const db = require('../config/db');
const m = require('../models');
const { notifyAdmins, notifyDoctor, notifyMember } = require('../models/notifications');
const { ownerId } = require('../models/members');
const { wrap } = require('./crud');
const { pad, clean, isEmail, phoneOk, today, nowHM, validDate, dateStr } = require('../config/util');

const STATUSES = ['pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show', 'rejected'];
const FREES_SLOT = ['cancelled', 'no_show', 'rejected'];
const OPEN = ['pending', 'confirmed', 'rescheduled']; // still waiting to happen
const LABEL = { pending: 'pending', confirmed: 'confirmed', rescheduled: 'rescheduled', cancelled: 'cancelled', completed: 'completed', no_show: 'marked as missed', rejected: 'rejected' };
const isDup = (e) => e.code === 'ER_DUP_ENTRY' || /UNIQUE constraint/.test(e.message || '');
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const t12 = (t) => { const [h, mi] = String(t).split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(mi || 0)} ${h < 12 ? 'AM' : 'PM'}`; };
const when = (a) => `${String(a.appointment_date).slice(0, 10)} at ${t12(a.appointment_time)}`;
const info = (a) => ({ appointment_id: a.id, reference: a.reference, customer_name: a.name, appointment_date: String(a.appointment_date).slice(0, 10), appointment_time: a.appointment_time, service: a.service || null });

// What the patient is told when their booking changes
const memberMsg = (a, status, moved, doctor) => {
  if (moved) return `Your appointment ${a.reference} has been rescheduled to ${when(a)}.`;
  if (status === 'confirmed') return `Your appointment ${a.reference} on ${when(a)} has been confirmed${doctor ? ` with ${doctor}` : ''}.`;
  if (status === 'completed') return `Your appointment ${a.reference} has been marked as completed. Thank you for visiting Regenerix.`;
  if (status === 'rejected') return `Your appointment ${a.reference} on ${when(a)} could not be accepted. Our team will contact you to arrange another time.`;
  if (status === 'cancelled') return `Your appointment ${a.reference} on ${when(a)} has been cancelled.`;
  if (status === 'no_show') return `Your appointment ${a.reference} on ${when(a)} was marked as missed.`;
  return null;
};

// Opening hours come from the settings table (slot_start, slot_end, slot_minutes, slot_sunday_start, slot_sunday_end).
const toMin = (t) => { const [h, mi] = String(t || '').split(':').map(Number); return h * 60 + (mi || 0); };
function daySlots(date, st) {
  const [a, b] = new Date(`${date}T00:00:00`).getDay() === 0 ? [st.slot_sunday_start, st.slot_sunday_end] : [st.slot_start, st.slot_end];
  if (!a || !b) return [];
  const step = Math.max(10, Number(st.slot_minutes) || 30), out = [];
  for (let x = toMin(a); x + step <= toMin(b); x += step) out.push(`${pad(Math.floor(x / 60))}:${pad(x % 60)}`);
  return out;
}
const inWindow = (date, st) => { const max = new Date(); max.setDate(max.getDate() + (Number(st.booking_days_ahead) || 60)); return date >= today() && date <= dateStr(max); };
async function availability(date, st, exceptId) {
  const q = db('appointments').where({ appointment_date: date }).whereNotNull('slot_key'); if (exceptId) q.whereNot('id', exceptId);
  const taken = new Set((await q.select('appointment_time')).map((r) => r.appointment_time));
  const now = date === today() ? nowHM() : null;
  return daySlots(date, st).map((time) => ({ time, available: !taken.has(time) && !(now && time <= now) }));
}
// The team member chosen for assignment must have an active doctor login, otherwise nobody would ever see the appointment.
const doctorFor = async (teamId) => {
  const t = await m.team.find(Number(teamId)); if (!t) return null;
  const login = await db('admins').where({ role: 'doctor', team_id: t.id }).where((q) => q.where({ is_active: 1 }).orWhereNull('is_active')).first();
  return login ? t : null;
};

// ---------- public ----------
exports.slots = wrap(async (req, res) => {
  const date = String(req.query.date || '');
  if (!validDate(date)) return bad(res, 'Choose a valid date');
  const st = await m.settings.all();
  res.json({ success: true, date, slots: inWindow(date, st) ? await availability(date, st) : [] });
});

exports.create = wrap(async (req, res) => {
  const b = req.body || {}, st = await m.settings.all();
  const name = clean(b.name, 120), email = clean(b.email, 190).toLowerCase(), phone = clean(b.phone, 30), date = clean(b.appointment_date, 10), time = clean(b.appointment_time, 5);
  if (!name || !isEmail(email) || !phoneOk(phone)) return bad(res, 'Enter your name, a valid email and a valid mobile number');
  if (!validDate(date) || !inWindow(date, st)) return bad(res, 'Choose a date within the booking window');
  const slot = (await availability(date, st)).find((s) => s.time === time);
  if (!slot) return bad(res, 'That time is outside our opening hours');
  if (!slot.available) return bad(res, 'That time slot is no longer available. Please choose another.', 409);
  let team = null;
  if (b.team_id) { team = await m.team.find(Number(b.team_id)); if (!team || !team.is_active) return bad(res, 'Selected specialist is not available'); }
  const reference = `RGX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  // logged-in member -> their account; otherwise an existing account with the same email AND phone
  const memberId = req.member ? req.member.id : await ownerId(null, email, phone);
  try {
    const id = await db.transaction(async (trx) => {
      const [id] = await trx('appointments').insert({ reference, name, email, phone, service: clean(b.service, 190) || null, team_id: team ? team.id : null, appointment_date: date, appointment_time: time,
        reason: clean(b.reason, 2000) || null, notes: clean(b.notes, 2000) || null, status: 'pending', slot_key: `${date}|${time}`, member_id: memberId });
      await trx('appointment_history').insert({ appointment_id: id, action: 'created', note: req.member ? 'Booked from the member dashboard' : 'Booked from the website' });
      await notifyAdmins(trx, 'appointment_booking', 'A new appointment has been booked.', { appointment_id: id, reference, customer_name: name, appointment_date: date, appointment_time: time, service: clean(b.service, 190) || null });
      if (memberId) await notifyMember(trx, memberId, 'appointment_booked', `Your appointment request ${reference} for ${date} at ${t12(time)} has been received. We will confirm it shortly.`, { appointment_id: id, reference });
      return id;
    });
    res.status(201).json({ success: true, id, reference, appointment_date: date, appointment_time: time });
  } catch (e) { if (isDup(e)) return bad(res, 'That time slot was just taken. Please choose another.', 409); throw e; }
});

// ---------- shared ----------
const joined = () => db('appointments as a').leftJoin('team_members as t', 't.id', 'a.team_id').leftJoin('team_members as d', 'd.id', 'a.assigned_to');
const COLS = ['a.*', 't.name as team_name', 'd.name as doctor_name', 'd.image_url as doctor_image'];
const one = async (id, where = {}) => {
  const a = await joined().where('a.id', id).where(where).select(COLS).first();
  if (!a) return null;
  a.history = await db('appointment_history as h').leftJoin('admins as u', 'u.id', 'h.admin_id').where({ appointment_id: id }).orderBy('h.id', 'desc').select('h.*', 'u.name as by_name', 'u.role as by_role'); return a;
};
const page = (q) => { const p = Math.max(1, Number(q.page) || 1), limit = Math.min(100, Math.max(1, Number(q.limit) || 20)); return { p, limit }; };
const filters = (q, f) => {
  if (f.q) q.where((w) => ['a.name', 'a.email', 'a.phone', 'a.reference'].forEach((c) => w.orWhere(c, 'like', `%${f.q}%`)));
  if (f.status) q.where('a.status', f.status); if (f.service) q.where('a.service', f.service); if (f.team_id) q.where('a.team_id', f.team_id);
  if (f.assigned_to === 'none') q.whereNull('a.assigned_to'); else if (f.assigned_to) q.where('a.assigned_to', f.assigned_to);
  if (f.date_from) q.where('a.appointment_date', '>=', f.date_from); if (f.date_to) q.where('a.appointment_date', '<=', f.date_to);
  if (f.when === 'upcoming') q.where('a.appointment_date', '>=', today()).whereIn('a.status', OPEN);
  if (f.when === 'today') q.where('a.appointment_date', today());
  if (f.when === 'overdue') q.where('a.appointment_date', '<', today()).whereIn('a.status', OPEN);
  return q;
};
const listing = async (req, res, scope, order = 'desc') => {
  const { p, limit } = page(req.query);
  const base = () => scope(filters(joined(), req.query));
  const total = Number((await base().count({ c: 'a.id' }).first()).c);
  const data = await base().select(COLS).orderBy([{ column: 'a.appointment_date', order }, { column: 'a.appointment_time', order }]).limit(limit).offset((p - 1) * limit);
  res.json({ success: true, data, total, page: p, pages: Math.max(1, Math.ceil(total / limit)) });
};
const count = (scope, extra = (q) => q) => extra(scope(db('appointments as a'))).count({ c: 'a.id' }).first().then((r) => Number(r.c));

// ---------- admin ----------
exports.adminList = wrap((req, res) => listing(req, res, (q) => q));
exports.adminGet = wrap(async (req, res) => { const a = await one(req.params.id); a ? res.json({ success: true, data: a }) : bad(res, 'Not found', 404); });
exports.adminUpdate = wrap(async (req, res) => {
  const id = Number(req.params.id), a = await db('appointments').where({ id }).first(), b = req.body || {};
  if (!a) return bad(res, 'Not found', 404);
  if (b.status && !STATUSES.includes(b.status)) return bad(res, 'Unknown status');
  const date = b.appointment_date || a.appointment_date, time = b.appointment_time || a.appointment_time;
  const moved = date !== a.appointment_date || time !== a.appointment_time;
  let status = b.status || a.status, note = clean(b.note, 500);
  if (moved) {
    const st = await m.settings.all();
    if (!validDate(date) || date < today()) return bad(res, 'Choose a valid future date');
    const slot = (await availability(date, st, id)).find((s) => s.time === time);
    if (!slot || !slot.available) return bad(res, 'That time slot is not available', 409);
    if (!b.status) status = 'rescheduled';
    note = note || `Moved from ${a.appointment_date} ${a.appointment_time} to ${date} ${time}`;
  }
  // Assignment: assigned_to = team member id of the doctor, '' / null = unassign, undefined = leave as is
  let assignTo = a.assigned_to, doctor = null;
  if (b.assigned_to !== undefined) {
    assignTo = b.assigned_to === '' || b.assigned_to === null ? null : Number(b.assigned_to);
    if (assignTo) { doctor = await doctorFor(assignTo); if (!doctor) return bad(res, 'This team member has no active doctor login. Create one under Doctors first.'); }
  }
  const reassigned = (assignTo || null) !== (a.assigned_to || null);
  if (reassigned && assignTo && status === 'rejected' && !b.status) status = 'confirmed'; // reassigning a booking a doctor rejected re-opens it
  const upd = { appointment_date: date, appointment_time: time, status, slot_key: FREES_SLOT.includes(status) ? null : `${date}|${time}`, updated_at: db.fn.now() };
  if (b.notes !== undefined) upd.notes = clean(b.notes, 2000) || null;
  if (reassigned) { upd.assigned_to = assignTo; upd.assigned_at = assignTo ? db.fn.now() : null; }
  const statusChanged = status !== a.status;
  if (!doctor && assignTo) doctor = await m.team.find(assignTo);
  try {
    await db.transaction(async (trx) => {
      await trx('appointments').where({ id }).update(upd);
      const now = { ...a, ...upd }, d = info({ ...now, id });
      if (reassigned) {
        await trx('appointment_history').insert({ appointment_id: id, action: assignTo ? 'assigned' : 'unassigned', note: `${assignTo ? `Assigned to ${doctor.name}` : 'Doctor removed'}${note && !moved && !statusChanged ? ` — ${note}` : ''}`, admin_id: req.admin.id });
        if (assignTo) await notifyDoctor(trx, assignTo, 'appointment_assigned', `New appointment assigned to you: ${a.name} on ${when(now)}.`, d);
        if (a.assigned_to) await notifyDoctor(trx, a.assigned_to, 'appointment_unassigned', `Appointment ${a.reference} (${a.name}) is no longer assigned to you.`, d);
        if (assignTo) await notifyMember(trx, a.member_id, 'appointment_update', `${doctor.name} has been assigned to your appointment ${a.reference} on ${when(now)}.`, { appointment_id: id, reference: a.reference });
      }
      if (moved || statusChanged || (note && !reassigned)) await trx('appointment_history').insert({ appointment_id: id, action: moved ? 'rescheduled' : status, note: note || null, admin_id: req.admin.id });
      if (moved || statusChanged) {
        const msg = memberMsg(now, status, moved, !reassigned && assignTo ? doctor && doctor.name : null);
        if (msg) await notifyMember(trx, a.member_id, 'appointment_update', msg, { appointment_id: id, reference: a.reference, status });
        if (assignTo && !reassigned) await notifyDoctor(trx, assignTo, 'appointment_updated', moved ? `Appointment ${a.reference} (${a.name}) moved to ${when(now)}.` : `Appointment ${a.reference} (${a.name}) is now ${LABEL[status]}.`, d);
      }
    });
  } catch (e) { if (isDup(e)) return bad(res, 'That time slot is already booked', 409); throw e; }
  res.json({ success: true, data: await one(id) });
});
exports.adminRemove = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await db('appointments').where({ id }).first())) return bad(res, 'Not found', 404);
  await db.transaction(async (trx) => { await trx('appointment_history').where({ appointment_id: id }).del(); await trx('appointments').where({ id }).del(); });
  res.json({ success: true });
});
// Team members that can receive appointments (have an active doctor login)
exports.assignable = wrap(async (req, res) => {
  const rows = await db('team_members as t').join('admins as u', 'u.team_id', 't.id').where('u.role', 'doctor')
    .where((q) => q.where('u.is_active', 1).orWhereNull('u.is_active')).distinct('t.id', 't.name', 't.role', 't.image_url').orderBy('t.name');
  res.json({ success: true, data: rows });
});

// ---------- doctor (only appointments assigned to their team member) ----------
const mineDoc = (req) => (q) => q.where('a.assigned_to', req.admin.team_id || -1);
exports.doctorList = wrap((req, res) => listing(req, res, mineDoc(req), req.query.when === 'upcoming' || req.query.when === 'today' ? 'asc' : 'desc'));
exports.doctorGet = wrap(async (req, res) => { const a = await one(req.params.id, { 'a.assigned_to': req.admin.team_id || -1 }); a ? res.json({ success: true, data: a }) : bad(res, 'Not found', 404); });
exports.doctorUpdate = wrap(async (req, res) => {
  const id = Number(req.params.id), b = req.body || {}, note = clean(b.note, 500);
  const a = await db('appointments').where({ id, assigned_to: req.admin.team_id || -1 }).first();
  if (!a) return bad(res, 'Not found', 404);
  if (!['completed', 'rejected'].includes(b.status)) return bad(res, 'Choose Completed or Rejected');
  if (!OPEN.includes(a.status)) return bad(res, `This appointment is already ${LABEL[a.status] || a.status}. Ask the admin if it needs to change.`);
  if (b.status === 'rejected' && note.length < 3) return bad(res, 'Please give a reason for rejecting');
  if (b.status === 'completed' && String(a.appointment_date).slice(0, 10) > today()) return bad(res, 'You can mark it completed on or after the appointment date');
  const status = b.status, upd = { status, slot_key: FREES_SLOT.includes(status) ? null : a.slot_key, updated_at: db.fn.now() };
  const me = (await m.team.find(a.assigned_to)) || { name: req.admin.name };
  await db.transaction(async (trx) => {
    await trx('appointments').where({ id }).update(upd);
    await trx('appointment_history').insert({ appointment_id: id, action: status, note: note || null, admin_id: req.admin.id });
    await notifyAdmins(trx, 'doctor_update', `${me.name} marked appointment ${a.reference} as ${LABEL[status]}.`, { ...info(a), status, note: note || null, doctor_name: me.name });
    await notifyMember(trx, a.member_id, 'appointment_update', memberMsg(a, status, false), { appointment_id: id, reference: a.reference, status });
  });
  res.json({ success: true, data: await one(id) });
});
exports.doctorDashboard = wrap(async (req, res) => {
  const s = mineDoc(req), t = today();
  const [total, todayN, upcoming, completed, rejected, pending] = await Promise.all([
    count(s), count(s, (q) => q.where('a.appointment_date', t).whereIn('a.status', OPEN)), count(s, (q) => q.where('a.appointment_date', '>=', t).whereIn('a.status', OPEN)),
    count(s, (q) => q.where('a.status', 'completed')), count(s, (q) => q.where('a.status', 'rejected')), count(s, (q) => q.where('a.appointment_date', '<', t).whereIn('a.status', OPEN))]);
  const next = await s(joined()).where('a.appointment_date', '>=', t).whereIn('a.status', OPEN).select(COLS).orderBy([{ column: 'a.appointment_date' }, { column: 'a.appointment_time' }]).limit(6);
  const profile = req.admin.team_id ? await m.team.find(req.admin.team_id) : null;
  res.json({ success: true, stats: { total, today: todayN, upcoming, completed, rejected, overdue: pending }, upcoming: next, profile: profile && { name: profile.name, role: profile.role, image_url: profile.image_url } });
});

// ---------- member (only their own bookings; internal notes are never sent) ----------
const PRIVATE = ['notes', 'slot_key', 'member_id'];
const forMember = (a) => { if (!a) return a; PRIVATE.forEach((k) => delete a[k]); if (a.history) a.history = a.history.map((h) => ({ id: h.id, action: h.action, created_at: h.created_at, note: h.by_role === 'doctor' && h.action === 'rejected' ? h.note : null })); return a; };
const mineMem = (req) => (q) => q.where('a.member_id', req.member.id);
exports.memberList = wrap(async (req, res) => {
  const { p, limit } = page(req.query), base = () => mineMem(req)(filters(joined(), { status: req.query.status, when: req.query.when }));
  const total = Number((await base().count({ c: 'a.id' }).first()).c);
  const data = (await base().select(COLS).orderBy([{ column: 'a.appointment_date', order: 'desc' }, { column: 'a.appointment_time', order: 'desc' }]).limit(limit).offset((p - 1) * limit)).map(forMember);
  res.json({ success: true, data, total, page: p, pages: Math.max(1, Math.ceil(total / limit)) });
});
exports.memberGet = wrap(async (req, res) => { const a = await one(req.params.id, { 'a.member_id': req.member.id }); a ? res.json({ success: true, data: forMember(a) }) : bad(res, 'Not found', 404); });
exports.memberCounts = async (memberId) => {
  const s = (q) => q.where('a.member_id', memberId), t = today();
  const [total, upcoming, completed] = await Promise.all([count(s), count(s, (q) => q.where('a.appointment_date', '>=', t).whereIn('a.status', OPEN)), count(s, (q) => q.where('a.status', 'completed'))]);
  const next = (await s(joined()).where('a.appointment_date', '>=', t).whereIn('a.status', OPEN).select(COLS).orderBy([{ column: 'a.appointment_date' }, { column: 'a.appointment_time' }]).limit(5)).map(forMember);
  return { total, upcoming, completed, next };
};
exports.STATUSES = STATUSES;
