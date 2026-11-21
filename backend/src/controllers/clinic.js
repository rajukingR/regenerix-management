// Clinic management: patients -> consultations -> treatments (with visit entries) -> payments, plus expenses and reports.
// Money rule used everywhere: charged = consultation fees + package prices + per-visit amounts; settled = payments (amount + discount).
// A payment that is not linked to a consultation or treatment is an advance: it lowers the patient's balance.
const db = require('../config/db');
const m = require('../models');
const { wrap } = require('./crud');
const { clean, isEmail, today, validDate } = require('../config/util');

const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const money = (v) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);
const idOrNull = (v) => (v === '' || v == null ? null : Number(v) || null);
const dateOr = (v, fallback) => (validDate(v) ? v : fallback);
const like = (v) => `%${clean(v, 80).replace(/[%_\\]/g, '\\$&')}%`;
const num = (row, ...keys) => { if (row) for (const k of keys) row[k] = Number(row[k] || 0); return row; };
const MODES = ['cash', 'upi', 'card', 'bank', 'other'];
const CONS_STATUS = ['pending', 'completed', 'cancelled'];
const TREAT_STATUS = ['active', 'completed', 'cancelled'];

// Aliases are fixed: p = patients, c = consultations, t = treatments.
const settled = (col, alias) => `(select coalesce(sum(x.amount + x.discount), 0) from clinic_payments x where x.${col} = ${alias}.id)`;
const SQL = {
  consDue: `((case when c.status = 'cancelled' then 0 else c.fee end) - ${settled('consultation_id', 'c')})`,
  consPaid: settled('consultation_id', 'c'),
  treatCharged: `(case when t.package_type = 'package' then (case when t.status = 'cancelled' then 0 else t.package_price end) else (select coalesce(sum(v.amount), 0) from treatment_visits v where v.treatment_id = t.id) end)`,
  treatPaid: settled('treatment_id', 't'),
  visits: '(select count(*) from treatment_visits v where v.treatment_id = t.id)',
  lastVisit: '(select max(v.visit_date) from treatment_visits v where v.treatment_id = t.id)',
  patCharged: `((select coalesce(sum(c2.fee), 0) from consultations c2 where c2.patient_id = p.id and c2.status <> 'cancelled')
    + (select coalesce(sum(t2.package_price), 0) from treatments t2 where t2.patient_id = p.id and t2.package_type = 'package' and t2.status <> 'cancelled')
    + (select coalesce(sum(v2.amount), 0) from treatment_visits v2 join treatments t3 on t3.id = v2.treatment_id where t3.patient_id = p.id and t3.package_type <> 'package'))`,
  patPaid: settled('patient_id', 'p'),
};
SQL.treatDue = `(${SQL.treatCharged} - ${SQL.treatPaid})`;
SQL.patDue = `(${SQL.patCharged} - ${SQL.patPaid})`;

// { data, total, page, pages } like the appointments list
async function paged(q, req, order) {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15)), page = Math.max(1, Number(req.query.page) || 1);
  const total = Number((await q.clone().clearSelect().clearOrder().count({ c: '*' }).first()).c);
  for (const [col, dir] of order) q.orderBy(col, dir);
  return { success: true, data: await q.limit(limit).offset((page - 1) * limit), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
// Insert a row, then stamp its readable number from the new id (unique, gap-free enough, no race).
const numbered = (table, col, prefix, row, trx = db) => trx.transaction(async (x) => {
  const [id] = await x(table).insert(row);
  await x(table).where({ id }).update({ [col]: `${prefix}${String(id).padStart(5, '0')}` });
  return id;
});
const range = (q, col, from, to) => { if (validDate(from)) q.where(col, '>=', from); if (validDate(to)) q.where(col, '<=', to); return q; };
const doctorOk = async (id) => !id || !!(await db('team_members').where({ id }).first());

// ---------- options + dashboard summary ----------
exports.options = wrap(async (req, res) => res.json({ success: true, modes: MODES,
  doctors: await db('team_members').where({ is_active: 1 }).orderBy('sort_order').orderBy('id').select('id', 'name', 'role', 'image_url'),
  // active admin accounts, so an expense can be marked as paid to the admin as well as to a doctor
  admins: await db('admins').where({ role: 'admin' }).where((q) => q.where({ is_active: 1 }).orWhereNull('is_active')).orderBy('id').select('id', 'name') }));

exports.summary = wrap(async (req, res) => {
  const d = today(), one = async (q) => Number((await q.first()).c || 0);
  res.json({ success: true,
    patients: await one(db('patients').count({ c: '*' })),
    pending_consultations: await one(db('consultations').where({ status: 'pending' }).count({ c: '*' })),
    active_treatments: await one(db('treatments').where({ status: 'active' }).count({ c: '*' })),
    home_visits: await one(db('treatments').where({ status: 'active', service_type: 'home' }).count({ c: '*' })),
    dues: await one(db({ p: 'patients' }).whereRaw(`${SQL.patDue} > 0`).select(db.raw(`coalesce(sum(${SQL.patDue}), 0) as c`))),
    today: { date: d,
      new_patients: await one(db('patients').where('created_at', '>=', `${d} 00:00:00`).count({ c: '*' })),
      consultations: await one(db('consultations').where({ visit_date: d }).count({ c: '*' })),
      visits: await one(db('treatment_visits').where({ visit_date: d }).count({ c: '*' })),
      collected: await one(db('clinic_payments').where({ paid_on: d }).select(db.raw('coalesce(sum(amount), 0) as c'))),
      expenses: await one(db('expenses').where({ spent_on: d }).select(db.raw('coalesce(sum(amount), 0) as c'))) } });
});

// ---------- patients ----------
const patientBody = (b = {}) => {
  const age = b.age === '' || b.age == null ? null : Math.min(130, Math.max(0, parseInt(b.age, 10) || 0));
  return { name: clean(b.name, 120), guardian_name: clean(b.guardian_name, 120) || null, gender: ['male', 'female', 'other'].includes(b.gender) ? b.gender : null,
    dob: dateOr(b.dob, null), age, phone: clean(b.phone, 30) || null, email: clean(b.email, 190).toLowerCase() || null, city: clean(b.city, 120) || null,
    address: clean(b.address, 1000) || null, referred_by: clean(b.referred_by, 120) || null, remarks: clean(b.remarks, 2000) || null };
};
const patientCheck = (p) => (!p.name ? 'Enter the patient name' : p.email && !isEmail(p.email) ? 'Enter a valid email' : p.phone && !/^[+\d][\d\s-]{6,16}$/.test(p.phone) ? 'Enter a valid contact number' : p.dob && p.dob > today() ? 'Date of birth cannot be in the future' : null);
const patientQ = () => db({ p: 'patients' }).select('p.*', db.raw(`${SQL.patCharged} as charged`), db.raw(`${SQL.patPaid} as paid`));

exports.patients = wrap(async (req, res) => {
  const { q, city, due } = req.query, x = patientQ();
  if (q) { const s = like(q); x.where((w) => w.where('p.name', 'like', s).orWhere('p.phone', 'like', s).orWhere('p.file_no', 'like', s).orWhere('p.email', 'like', s)); }
  if (city) x.where('p.city', 'like', like(city));
  if (due === '1') x.whereRaw(`${SQL.patDue} > 0`);
  if (due === 'advance') x.whereRaw(`${SQL.patDue} < 0`);
  const out = await paged(x, req, [['p.id', 'desc']]);
  out.data.forEach((r) => { num(r, 'charged', 'paid'); r.balance = Math.round((r.charged - r.paid) * 100) / 100; });
  res.json(out);
});
exports.patientCreate = wrap(async (req, res) => {
  const p = patientBody(req.body), err = patientCheck(p); if (err) return bad(res, err);
  const id = await numbered('patients', 'file_no', 'RGX-', p);
  res.status(201).json({ success: true, data: await db('patients').where({ id }).first() });
});
exports.patientGet = wrap(async (req, res) => {
  const p = await patientQ().where('p.id', req.params.id).first(); if (!p) return bad(res, 'Patient not found', 404);
  num(p, 'charged', 'paid'); p.balance = Math.round((p.charged - p.paid) * 100) / 100;
  p.consultations = (await consQ().where('c.patient_id', p.id).orderBy('c.id', 'desc')).map(consRow);
  p.treatments = (await treatQ().where('t.patient_id', p.id).orderBy('t.id', 'desc')).map(treatRow);
  p.payments = (await payQ().where('y.patient_id', p.id).orderBy('y.id', 'desc')).map((r) => num(r, 'amount', 'discount'));
  res.json({ success: true, data: p });
});
exports.patientUpdate = wrap(async (req, res) => {
  if (!(await db('patients').where({ id: req.params.id }).first())) return bad(res, 'Patient not found', 404);
  const p = patientBody(req.body), err = patientCheck(p); if (err) return bad(res, err);
  await db('patients').where({ id: req.params.id }).update({ ...p, updated_at: db.fn.now() });
  res.json({ success: true, data: await db('patients').where({ id: req.params.id }).first() });
});
exports.patientRemove = wrap(async (req, res) => {
  const id = req.params.id;
  for (const t of ['consultations', 'treatments', 'clinic_payments'])
    if (await db(t).where({ patient_id: id }).first()) return bad(res, 'This patient has consultations, treatments or payments. Delete those first.', 409);
  (await db('patients').where({ id }).del()) ? res.json({ success: true }) : bad(res, 'Patient not found', 404);
});

// ---------- consultations ----------
const consQ = () => db({ c: 'consultations' }).leftJoin({ p: 'patients' }, 'p.id', 'c.patient_id').leftJoin({ d: 'team_members' }, 'd.id', 'c.doctor_id')
  .select('c.*', 'p.name as patient_name', 'p.file_no', 'p.phone as patient_phone', 'd.name as doctor_name', db.raw(`${SQL.consPaid} as paid`));
const consRow = (r) => { num(r, 'fee', 'paid'); r.due = r.status === 'cancelled' ? 0 : Math.round((r.fee - r.paid) * 100) / 100; return r; };
const TEXTS = ['complaints', 'allergies', 'examination', 'diagnosis', 'investigation', 'advice', 'prescription'];

exports.consultations = wrap(async (req, res) => {
  const { q, status, doctor_id, patient_id, date_from, date_to, due } = req.query, x = consQ();
  if (q) { const s = like(q); x.where((w) => w.where('p.name', 'like', s).orWhere('p.phone', 'like', s).orWhere('p.file_no', 'like', s).orWhere('c.case_no', 'like', s)); }
  if (CONS_STATUS.includes(status)) x.where('c.status', status);
  if (doctor_id) x.where('c.doctor_id', Number(doctor_id)); if (patient_id) x.where('c.patient_id', Number(patient_id));
  range(x, 'c.visit_date', date_from, date_to);
  if (due === '1') x.whereRaw(`${SQL.consDue} > 0`);
  const out = await paged(x, req, [['c.visit_date', 'desc'], ['c.id', 'desc']]); out.data.forEach(consRow); res.json(out);
});
exports.consultationGet = wrap(async (req, res) => {
  const c = await consQ().where('c.id', req.params.id).first(); if (!c) return bad(res, 'Consultation not found', 404);
  consRow(c); c.patient = await db('patients').where({ id: c.patient_id }).first();
  c.payments = (await payQ().where('y.consultation_id', c.id).orderBy('y.id', 'desc')).map((r) => num(r, 'amount', 'discount'));
  res.json({ success: true, data: c });
});
exports.consultationCreate = wrap(async (req, res) => {
  const b = req.body || {}, patient_id = Number(b.patient_id), doctor_id = idOrNull(b.doctor_id);
  if (!(await db('patients').where({ id: patient_id }).first())) return bad(res, 'Choose a patient');
  if (!(await doctorOk(doctor_id))) return bad(res, 'Choose a valid doctor');
  const row = { patient_id, doctor_id, visit_date: dateOr(b.visit_date, today()), fee: money(b.fee), referred_by: clean(b.referred_by, 120) || null,
    height_cm: clean(b.height_cm, 10) || null, weight_kg: clean(b.weight_kg, 10) || null, status: 'pending' };
  for (const k of TEXTS) row[k] = clean(b[k], 5000) || null;
  const id = await numbered('consultations', 'case_no', 'CASE-', row);
  res.status(201).json({ success: true, data: consRow(await consQ().where('c.id', id).first()) });
});
exports.consultationUpdate = wrap(async (req, res) => {
  const c = await db('consultations').where({ id: req.params.id }).first(); if (!c) return bad(res, 'Consultation not found', 404);
  const b = req.body || {}, upd = {};
  if (b.doctor_id !== undefined) { upd.doctor_id = idOrNull(b.doctor_id); if (!(await doctorOk(upd.doctor_id))) return bad(res, 'Choose a valid doctor'); }
  if (b.visit_date !== undefined) { if (!validDate(b.visit_date)) return bad(res, 'Choose a valid visit date'); upd.visit_date = b.visit_date; }
  if (b.next_visit_date !== undefined) upd.next_visit_date = dateOr(b.next_visit_date, null);
  if (b.fee !== undefined) upd.fee = money(b.fee);
  if (b.status !== undefined) { if (!CONS_STATUS.includes(b.status)) return bad(res, 'Unknown status'); upd.status = b.status; }
  for (const k of ['referred_by']) if (b[k] !== undefined) upd[k] = clean(b[k], 120) || null;
  for (const k of ['height_cm', 'weight_kg']) if (b[k] !== undefined) upd[k] = clean(b[k], 10) || null;
  for (const k of TEXTS) if (b[k] !== undefined) upd[k] = clean(b[k], 5000) || null;
  if (Object.keys(upd).length) await db('consultations').where({ id: c.id }).update({ ...upd, updated_at: db.fn.now() });
  res.json({ success: true, data: consRow(await consQ().where('c.id', c.id).first()) });
});
exports.consultationRemove = wrap(async (req, res) => {
  if (await db('clinic_payments').where({ consultation_id: req.params.id }).first()) return bad(res, 'This consultation has payments. Delete the payments first, or mark it cancelled.', 409);
  (await db('consultations').where({ id: req.params.id }).del()) ? res.json({ success: true }) : bad(res, 'Consultation not found', 404);
});

// ---------- treatments ----------
const treatQ = () => db({ t: 'treatments' }).leftJoin({ p: 'patients' }, 'p.id', 't.patient_id').leftJoin({ d: 'team_members' }, 'd.id', 't.doctor_id')
  .select('t.*', 'p.name as patient_name', 'p.file_no', 'p.phone as patient_phone', 'd.name as doctor_name',
    db.raw(`${SQL.treatCharged} as charged`), db.raw(`${SQL.treatPaid} as paid`), db.raw(`${SQL.visits} as visits`), db.raw(`${SQL.lastVisit} as last_visit`));
const treatRow = (r) => { num(r, 'session_fee', 'package_price', 'charged', 'paid', 'visits'); r.due = Math.round((r.charged - r.paid) * 100) / 100;
  r.remaining = r.package_type === 'package' && r.total_sessions ? Math.max(0, r.total_sessions - r.visits) : null; return r; };
const treatBody = (b, row = {}) => {
  if (b.diagnosis !== undefined) row.diagnosis = clean(b.diagnosis, 5000) || null;
  if (b.details !== undefined) row.details = clean(b.details, 5000) || null;
  if (b.remarks !== undefined) row.remarks = clean(b.remarks, 2000) || null;
  if (b.referred_by !== undefined) row.referred_by = clean(b.referred_by, 120) || null;
  if (b.next_visit_date !== undefined) row.next_visit_date = dateOr(b.next_visit_date, null);
  if (b.service_type !== undefined) row.service_type = b.service_type === 'home' ? 'home' : 'clinic';
  if (b.session_fee !== undefined) row.session_fee = money(b.session_fee);
  if (b.package_price !== undefined) row.package_price = money(b.package_price);
  if (b.total_sessions !== undefined) row.total_sessions = b.total_sessions === '' || b.total_sessions == null ? null : Math.min(999, Math.max(1, parseInt(b.total_sessions, 10) || 1));
  return row;
};

exports.treatments = wrap(async (req, res) => {
  const { q, status, service_type, package_type, doctor_id, patient_id, due } = req.query, x = treatQ();
  if (q) { const s = like(q); x.where((w) => w.where('p.name', 'like', s).orWhere('p.phone', 'like', s).orWhere('p.file_no', 'like', s).orWhere('t.treatment_no', 'like', s)); }
  if (TREAT_STATUS.includes(status)) x.where('t.status', status);
  if (['clinic', 'home'].includes(service_type)) x.where('t.service_type', service_type);
  if (['regular', 'package', 'procedure'].includes(package_type)) x.where('t.package_type', package_type);
  if (doctor_id) x.where('t.doctor_id', Number(doctor_id)); if (patient_id) x.where('t.patient_id', Number(patient_id));
  if (due === '1') x.whereRaw(`${SQL.treatDue} > 0`);
  const out = await paged(x, req, [['t.id', 'desc']]); out.data.forEach(treatRow); res.json(out);
});
exports.treatmentGet = wrap(async (req, res) => {
  const t = await treatQ().where('t.id', req.params.id).first(); if (!t) return bad(res, 'Treatment not found', 404);
  treatRow(t); t.patient = await db('patients').where({ id: t.patient_id }).first();
  t.visit_list = (await db({ v: 'treatment_visits' }).leftJoin({ d: 'team_members' }, 'd.id', 'v.doctor_id').where('v.treatment_id', t.id).orderBy('v.visit_date', 'desc').orderBy('v.id', 'desc').select('v.*', 'd.name as doctor_name')).map((r) => num(r, 'amount'));
  t.payments = (await payQ().where('y.treatment_id', t.id).orderBy('y.id', 'desc')).map((r) => num(r, 'amount', 'discount'));
  res.json({ success: true, data: t });
});
exports.treatmentCreate = wrap(async (req, res) => {
  const b = req.body || {}, patient_id = Number(b.patient_id), doctor_id = idOrNull(b.doctor_id);
  if (!(await db('patients').where({ id: patient_id }).first())) return bad(res, 'Choose a patient');
  if (!(await doctorOk(doctor_id))) return bad(res, 'Choose a valid doctor');
  const package_type = ['regular', 'package', 'procedure'].includes(b.package_type) ? b.package_type : 'regular';
  const row = treatBody(b, { patient_id, doctor_id, package_type, service_type: 'clinic', consultation_id: idOrNull(b.consultation_id), start_date: dateOr(b.start_date, today()), status: 'active' });
  if (!row.details) return bad(res, 'Describe the treatment');
  if (package_type === 'package') { if (!row.total_sessions || !row.package_price) return bad(res, 'A package needs the number of sessions and the package price'); row.session_fee = 0; }
  else { row.total_sessions = null; row.package_price = 0; }
  const id = await numbered('treatments', 'treatment_no', 'TRT-', row);
  res.status(201).json({ success: true, data: treatRow(await treatQ().where('t.id', id).first()) });
});
exports.treatmentUpdate = wrap(async (req, res) => {
  const t = await db('treatments').where({ id: req.params.id }).first(); if (!t) return bad(res, 'Treatment not found', 404);
  const b = req.body || {}, upd = treatBody(b);
  if (b.doctor_id !== undefined) { upd.doctor_id = idOrNull(b.doctor_id); if (!(await doctorOk(upd.doctor_id))) return bad(res, 'Choose a valid doctor'); }
  if (b.status !== undefined) { if (!TREAT_STATUS.includes(b.status)) return bad(res, 'Unknown status'); upd.status = b.status; }
  if (upd.details === null) return bad(res, 'Describe the treatment');
  if (t.package_type === 'package') {
    delete upd.session_fee;
    const done = Number((await db('treatment_visits').where({ treatment_id: t.id }).count({ c: '*' }).first()).c);
    if (upd.total_sessions !== undefined && (!upd.total_sessions || upd.total_sessions < done)) return bad(res, `This package already has ${done} visit(s); the total cannot be lower`);
    if (upd.package_price !== undefined && !upd.package_price) return bad(res, 'Enter the package price');
  } else { delete upd.total_sessions; delete upd.package_price; }
  if (Object.keys(upd).length) await db('treatments').where({ id: t.id }).update({ ...upd, updated_at: db.fn.now() });
  res.json({ success: true, data: treatRow(await treatQ().where('t.id', t.id).first()) });
});
exports.treatmentRemove = wrap(async (req, res) => {
  const id = req.params.id;
  if (await db('clinic_payments').where({ treatment_id: id }).first()) return bad(res, 'This treatment has payments. Delete the payments first, or mark it cancelled.', 409);
  const n = await db.transaction(async (x) => { await x('treatment_visits').where({ treatment_id: id }).del(); return x('treatments').where({ id }).del(); });
  n ? res.json({ success: true }) : bad(res, 'Treatment not found', 404);
});
// A visit entry. body: { visit_date, amount?, notes?, doctor_id?, paid?, mode? }. `paid` records a payment against the treatment in the same transaction.
exports.visitCreate = wrap(async (req, res) => {
  const t = await db('treatments').where({ id: req.params.id }).first(); if (!t) return bad(res, 'Treatment not found', 404);
  if (t.status !== 'active') return bad(res, 'This treatment is not active');
  const b = req.body || {}, visit_date = dateOr(b.visit_date, today()), doctor_id = b.doctor_id === undefined ? t.doctor_id : idOrNull(b.doctor_id);
  if (visit_date > today()) return bad(res, 'A visit cannot be recorded for a future date');
  if (!(await doctorOk(doctor_id))) return bad(res, 'Choose a valid doctor');
  const isPkg = t.package_type === 'package', amount = isPkg ? 0 : (b.amount === undefined || b.amount === '' ? Number(t.session_fee) : money(b.amount));
  const paid = money(b.paid), mode = MODES.includes(b.mode) ? b.mode : 'cash';
  const done = Number((await db('treatment_visits').where({ treatment_id: t.id }).count({ c: '*' }).first()).c);
  if (isPkg && t.total_sessions && done >= t.total_sessions) return bad(res, 'All sessions in this package have been used');
  await db.transaction(async (x) => {
    await x('treatment_visits').insert({ treatment_id: t.id, doctor_id, visit_date, amount, notes: clean(b.notes, 2000) || null });
    if (paid > 0) await numbered('clinic_payments', 'receipt_no', 'RCP-', { patient_id: t.patient_id, treatment_id: t.id, amount: paid, discount: 0, mode, paid_on: visit_date, note: 'Paid at visit', received_by: req.admin.name || null }, x);
    if (b.next_visit_date !== undefined) await x('treatments').where({ id: t.id }).update({ next_visit_date: dateOr(b.next_visit_date, null), updated_at: db.fn.now() });
  });
  res.status(201).json({ success: true });
});
exports.visitRemove = wrap(async (req, res) => {
  const n = await db('treatment_visits').where({ id: req.params.vid, treatment_id: req.params.id }).del();
  n ? res.json({ success: true }) : bad(res, 'Visit not found', 404);
});

// ---------- payments / receipts ----------
const payQ = () => db({ y: 'clinic_payments' }).leftJoin({ p: 'patients' }, 'p.id', 'y.patient_id').leftJoin({ c: 'consultations' }, 'c.id', 'y.consultation_id').leftJoin({ t: 'treatments' }, 't.id', 'y.treatment_id')
  .select('y.*', 'p.name as patient_name', 'p.file_no', 'p.phone as patient_phone', 'p.email as patient_email', 'c.case_no', 't.treatment_no');

exports.payments = wrap(async (req, res) => {
  const { q, mode, patient_id, date_from, date_to } = req.query, x = payQ();
  if (q) { const s = like(q); x.where((w) => w.where('p.name', 'like', s).orWhere('p.phone', 'like', s).orWhere('p.file_no', 'like', s).orWhere('y.receipt_no', 'like', s)); }
  if (MODES.includes(mode)) x.where('y.mode', mode);
  if (patient_id) x.where('y.patient_id', Number(patient_id));
  range(x, 'y.paid_on', date_from, date_to);
  const out = await paged(x, req, [['y.paid_on', 'desc'], ['y.id', 'desc']]); out.data.forEach((r) => num(r, 'amount', 'discount')); res.json(out);
});
// What a patient still owes, item by item (used by the payment form)
exports.patientDues = wrap(async (req, res) => {
  const p = await patientQ().where('p.id', req.params.id).first(); if (!p) return bad(res, 'Patient not found', 404);
  num(p, 'charged', 'paid');
  const cons = (await consQ().where('c.patient_id', p.id).whereRaw(`${SQL.consDue} > 0`).orderBy('c.id')).map(consRow);
  const treats = (await treatQ().where('t.patient_id', p.id).whereRaw(`${SQL.treatDue} > 0`).orderBy('t.id')).map(treatRow);
  res.json({ success: true, balance: Math.round((p.charged - p.paid) * 100) / 100,
    items: [...cons.map((c) => ({ kind: 'consultation', id: c.id, label: `Consultation ${c.case_no}`, date: c.visit_date, due: c.due })),
      ...treats.map((t) => ({ kind: 'treatment', id: t.id, label: `Treatment ${t.treatment_no}`, date: t.start_date, due: t.due }))] });
});
// body: { patient_id, consultation_id? | treatment_id?, amount, discount?, mode, paid_on?, note? }
exports.paymentCreate = wrap(async (req, res) => {
  const b = req.body || {}, patient_id = Number(b.patient_id), amount = money(b.amount), discount = money(b.discount);
  const consultation_id = idOrNull(b.consultation_id), treatment_id = consultation_id ? null : idOrNull(b.treatment_id);
  if (!(await db('patients').where({ id: patient_id }).first())) return bad(res, 'Choose a patient');
  if (amount + discount <= 0) return bad(res, 'Enter the amount received');
  if (!MODES.includes(b.mode)) return bad(res, 'Choose a payment mode');
  const paid_on = dateOr(b.paid_on, today()); if (paid_on > today()) return bad(res, 'The payment date cannot be in the future');
  let due = null;
  if (consultation_id) { const c = await consQ().where('c.id', consultation_id).where('c.patient_id', patient_id).first(); if (!c) return bad(res, 'That consultation does not belong to this patient'); due = consRow(c).due; }
  if (treatment_id) { const t = await treatQ().where('t.id', treatment_id).where('t.patient_id', patient_id).first(); if (!t) return bad(res, 'That treatment does not belong to this patient'); due = treatRow(t).due; }
  if (due != null && amount + discount > due + 0.001) return bad(res, `Only ₹${due} is due on this item. Record the extra as an advance (no item selected).`);
  const id = await numbered('clinic_payments', 'receipt_no', 'RCP-', { patient_id, consultation_id, treatment_id, amount, discount, mode: b.mode, paid_on, note: clean(b.note, 255) || null, received_by: req.admin.name || null });
  res.status(201).json({ success: true, data: num(await payQ().where('y.id', id).first(), 'amount', 'discount') });
});
// Receipt: the payment plus the clinic's letterhead details from Settings
// Everything a receipt needs (also used for the PDF, the email and the WhatsApp link). Returns null when the receipt does not exist.
exports.receiptData = async (id) => {
  const y = await payQ().where('y.id', id).first(); if (!y) return null;
  num(y, 'amount', 'discount');
  const s = await m.settings.all(), p = await patientQ().where('p.id', y.patient_id).first(), r2 = (n) => Math.round(n * 100) / 100;
  if (p) { num(p, 'charged', 'paid'); p.balance = r2(p.charged - p.paid); }
  // The bill line: what this payment was for, what it cost, what had been paid before this receipt and what is still due after it.
  let item = { kind: 'advance', title: 'Advance payment', lines: ['Held on account for future visits'], charged: null };
  const col = y.consultation_id ? 'consultation_id' : y.treatment_id ? 'treatment_id' : null;
  if (y.consultation_id) {
    const c = consRow(await consQ().where('c.id', y.consultation_id).first());
    item = { kind: 'consultation', title: 'Consultation', lines: [`Case ${c.case_no}`, `Visit on ${String(c.visit_date).slice(0, 10).split('-').reverse().join('-')}`, c.doctor_name && `Seen by ${c.doctor_name}`].filter(Boolean), date: c.visit_date, charged: c.status === 'cancelled' ? 0 : c.fee };
  } else if (y.treatment_id) {
    const t = treatRow(await treatQ().where('t.id', y.treatment_id).first());
    item = { kind: 'treatment', title: t.package_type === 'package' ? `Treatment package (${t.total_sessions} sessions)` : t.package_type === 'procedure' ? 'Procedure' : `Treatment sessions (${t.visits} × ₹${t.session_fee})`,
      lines: [`Treatment ${t.treatment_no}`, t.details, t.doctor_name && `Treated by ${t.doctor_name}`, t.service_type === 'home' && 'Home visit'].filter(Boolean), date: t.start_date, charged: t.charged };
  }
  if (col) {
    item.paid_before = Number((await db('clinic_payments').where({ [col]: y[col] }).where('id', '<', y.id).select(db.raw('coalesce(sum(amount + discount), 0) as c')).first()).c || 0);
    item.due_after = r2(item.charged - item.paid_before - y.amount - y.discount);
  }
  return { ...y, patient: p, item,
    clinic: { name: s.site_name || 'Regenerix', phone: s.phone || '', email: s.email || '', address: s.address || s.short_address || '', logo: s.receipt_logo_url || s.logo_url || '', note: s.receipt_note || '', country_code: s.whatsapp_country_code || '91' } };
};
exports.paymentGet = wrap(async (req, res) => { const data = await exports.receiptData(req.params.id); data ? res.json({ success: true, data }) : bad(res, 'Receipt not found', 404); });
exports.paymentRemove = wrap(async (req, res) => { (await db('clinic_payments').where({ id: req.params.id }).del()) ? res.json({ success: true }) : bad(res, 'Receipt not found', 404); });

// Patients who owe money, largest first
exports.dues = wrap(async (req, res) => {
  const x = patientQ().whereRaw(`${SQL.patDue} > 0`);
  if (req.query.q) { const s = like(req.query.q); x.where((w) => w.where('p.name', 'like', s).orWhere('p.phone', 'like', s).orWhere('p.file_no', 'like', s)); }
  const total = Number((await db({ p: 'patients' }).whereRaw(`${SQL.patDue} > 0`).select(db.raw(`coalesce(sum(${SQL.patDue}), 0) as c`)).first()).c || 0);
  x.orderByRaw(`${SQL.patDue} desc`);
  const out = await paged(x, req, [['p.id', 'asc']]);
  out.data.forEach((r) => { num(r, 'charged', 'paid'); r.balance = Math.round((r.charged - r.paid) * 100) / 100; });
  res.json({ ...out, total_due: total });
});

// ---------- expenses ----------
const expenseBody = (b = {}) => ({ spent_on: dateOr(b.spent_on, today()), category: clean(b.category, 80), title: clean(b.title, 190), amount: money(b.amount),
  mode: MODES.includes(b.mode) ? b.mode : 'cash', paid_to: clean(b.paid_to, 120) || null, note: clean(b.note, 2000) || null });
const expenseCheck = (e) => (!e.title ? 'Enter what the expense was for' : !e.category ? 'Choose a category' : !e.amount ? 'Enter the amount' : e.spent_on > today() ? 'The date cannot be in the future' : null);
exports.expenses = wrap(async (req, res) => {
  const { q, category, date_from, date_to } = req.query, x = db('expenses').select('*');
  if (q) { const s = like(q); x.where((w) => w.where('title', 'like', s).orWhere('paid_to', 'like', s).orWhere('note', 'like', s)); }
  if (category) x.where({ category: clean(category, 80) });
  range(x, 'spent_on', date_from, date_to);
  const sum = Number((await x.clone().clearSelect().select(db.raw('coalesce(sum(amount), 0) as c')).first()).c || 0);
  const out = await paged(x, req, [['spent_on', 'desc'], ['id', 'desc']]); out.data.forEach((r) => num(r, 'amount'));
  res.json({ ...out, sum, categories: (await db('expenses').distinct('category').orderBy('category')).map((r) => r.category) });
});
exports.expenseCreate = wrap(async (req, res) => {
  const e = expenseBody(req.body), err = expenseCheck(e); if (err) return bad(res, err);
  const [id] = await db('expenses').insert(e); res.status(201).json({ success: true, data: num(await db('expenses').where({ id }).first(), 'amount') });
});
exports.expenseUpdate = wrap(async (req, res) => {
  if (!(await db('expenses').where({ id: req.params.id }).first())) return bad(res, 'Expense not found', 404);
  const e = expenseBody(req.body), err = expenseCheck(e); if (err) return bad(res, err);
  await db('expenses').where({ id: req.params.id }).update({ ...e, updated_at: db.fn.now() }); res.json({ success: true });
});
exports.expenseRemove = wrap(async (req, res) => { (await db('expenses').where({ id: req.params.id }).del()) ? res.json({ success: true }) : bad(res, 'Expense not found', 404); });

// ---------- reports ----------  GET ?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to the current month)
exports.reports = wrap(async (req, res) => {
  const d = today(), from = dateOr(req.query.from, `${d.slice(0, 8)}01`), to = dateOr(req.query.to, d);
  if (from > to) return bad(res, 'The start date must be on or before the end date');
  const one = async (q) => Number((await q.first()).c || 0), sum = (col) => db.raw(`coalesce(sum(${col}), 0) as c`);
  const between = (q, col) => q.where(col, '>=', from).where(col, '<=', to);
  const fees = await one(between(db('consultations').whereNot({ status: 'cancelled' }), 'visit_date').select(sum('fee')));
  const visitAmt = await one(between(db('treatment_visits'), 'visit_date').select(sum('amount')));
  const pkgAmt = await one(between(db('treatments').where({ package_type: 'package' }).whereNot({ status: 'cancelled' }), 'start_date').select(sum('package_price')));
  const collected = await one(between(db('clinic_payments'), 'paid_on').select(sum('amount')));
  const discounts = await one(between(db('clinic_payments'), 'paid_on').select(sum('discount')));
  const expenses = await one(between(db('expenses'), 'spent_on').select(sum('amount')));
  const grp = async (q, col) => (await q.groupBy(col).select({ k: col }, db.raw('count(*) as n'), db.raw('coalesce(sum(amount), 0) as total'))).map((r) => ({ key: r.k, count: Number(r.n), total: Number(r.total) }));
  const team = Object.fromEntries((await db('team_members').select('id', 'name')).map((t) => [t.id, t.name]));
  const docCons = await between(db('consultations').whereNot({ status: 'cancelled' }), 'visit_date').groupBy('doctor_id').select('doctor_id', db.raw('count(*) as n'), db.raw('coalesce(sum(fee), 0) as total'));
  const docVisits = await between(db('treatment_visits'), 'visit_date').groupBy('doctor_id').select('doctor_id', db.raw('count(*) as n'), db.raw('coalesce(sum(amount), 0) as total'));
  const doctors = {};
  const row = (id) => (doctors[id || 0] ||= { doctor_id: id || null, name: id ? team[id] || 'Removed doctor' : 'Not assigned', consultations: 0, visits: 0, billed: 0 });
  docCons.forEach((r) => { const x = row(r.doctor_id); x.consultations = Number(r.n); x.billed += Number(r.total); });
  docVisits.forEach((r) => { const x = row(r.doctor_id); x.visits = Number(r.n); x.billed += Number(r.total); });
  res.json({ success: true, from, to,
    counts: { new_patients: await one(db('patients').where('created_at', '>=', `${from} 00:00:00`).where('created_at', '<=', `${to} 23:59:59`).count({ c: '*' })),
      consultations: await one(between(db('consultations'), 'visit_date').count({ c: '*' })),
      new_treatments: await one(between(db('treatments'), 'start_date').count({ c: '*' })),
      visits: await one(between(db('treatment_visits'), 'visit_date').count({ c: '*' })),
      home_visits: await one(between(db({ v: 'treatment_visits' }).join({ t: 'treatments' }, 't.id', 'v.treatment_id').where('t.service_type', 'home'), 'v.visit_date').count({ c: '*' })) },
    money: { billed: Math.round((fees + visitAmt + pkgAmt) * 100) / 100, consultation_fees: fees, treatment_visits: visitAmt, packages: pkgAmt, collected, discounts, expenses, net: Math.round((collected - expenses) * 100) / 100 },
    by_mode: await grp(between(db('clinic_payments'), 'paid_on'), 'mode'),
    by_day: (await grp(between(db('clinic_payments'), 'paid_on'), 'paid_on')).map((r) => ({ ...r, key: String(r.key).slice(0, 10) })).sort((a, b) => (a.key < b.key ? -1 : 1)),
    expense_categories: (await grp(between(db('expenses'), 'spent_on'), 'category')).sort((a, b) => b.total - a.total),
    doctors: Object.values(doctors).sort((a, b) => b.billed - a.billed),
    referrals: (await db('patients').whereNotNull('referred_by').where('created_at', '>=', `${from} 00:00:00`).where('created_at', '<=', `${to} 23:59:59`).groupBy('referred_by').select('referred_by', db.raw('count(*) as n')))
      .map((r) => ({ key: r.referred_by, count: Number(r.n) })).sort((a, b) => b.count - a.count) });
});
