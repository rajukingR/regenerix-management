const fs = require('fs'), path = require('path');
const db = require('../config/db');
const { ROOT } = require('../config/upload');
const { notifyMember } = require('../models/notifications');
const { wrap } = require('./crud');
const STATUSES = ['new', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'];
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const withJob = () => db('career_applications as c').leftJoin('jobs as j', 'j.id', 'c.job_id');
const shape = (r) => { r.has_resume = !!r.resume_url; return r; };

// What the applicant is told when the admin changes the status
const MEMBER_MSG = {
  under_review: (j) => `Your application for ${j} is now under review.`,
  shortlisted: (j) => `Good news! Your resume has been shortlisted for ${j}.`,
  interview: (j) => `You have been invited to an interview for ${j}. Our team will contact you with the details.`,
  selected: (j) => `Congratulations! You have been selected for ${j}.`,
  rejected: (j) => `Thank you for applying for ${j}. Your resume was not shortlisted this time.`,
  new: (j) => `Your application for ${j} has been received.`,
};

exports.list = wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)), f = req.query;
  const base = () => {
    const q = withJob();
    if (f.q) q.where((w) => w.where('c.name', 'like', `%${f.q}%`).orWhere('c.email', 'like', `%${f.q}%`));
    if (f.job_id) q.where('c.job_id', f.job_id); if (f.status) q.where('c.status', f.status);
    if (f.date_from) q.where('c.created_at', '>=', `${f.date_from} 00:00:00`); if (f.date_to) q.where('c.created_at', '<=', `${f.date_to} 23:59:59`);
    return q;
  };
  const total = Number((await base().count({ c: 'c.id' }).first()).c);
  const data = (await base().select('c.*', 'j.title as job_title').orderBy('c.id', 'desc').limit(limit).offset((page - 1) * limit)).map(shape);
  res.json({ success: true, data, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
exports.get = wrap(async (req, res) => { const r = await withJob().where('c.id', req.params.id).select('c.*', 'j.title as job_title').first(); r ? res.json({ success: true, data: shape(r) }) : bad(res, 'Not found', 404); });
// body: { status, note? }  note is shown to the applicant in their dashboard and in the notification
exports.update = wrap(async (req, res) => {
  const { status } = req.body || {}, note = String(req.body?.note ?? '').trim().slice(0, 1000);
  if (!STATUSES.includes(status)) return bad(res, 'Unknown status');
  const a = await withJob().where('c.id', req.params.id).select('c.*', 'j.title as job_title').first();
  if (!a) return bad(res, 'Not found', 404);
  const changed = a.status !== status;
  await db.transaction(async (trx) => {
    const upd = { status, updated_at: db.fn.now() }; if (req.body?.note !== undefined) upd.status_note = note || null;
    await trx('career_applications').where({ id: a.id }).update(upd);
    if (changed && a.member_id) {
      const job = a.job_title || 'a role at Regenerix';
      await notifyMember(trx, a.member_id, 'application_status', `${MEMBER_MSG[status](job)}${note ? ` ${note}` : ''}`, { application_id: a.id, job_title: a.job_title || null, status });
    }
  });
  res.json({ success: true, notified: changed && !!a.member_id });
});
exports.remove = wrap(async (req, res) => {
  const r = await db('career_applications').where({ id: req.params.id }).first(); if (!r) return bad(res, 'Not found', 404);
  if (r.resume_url) fs.unlink(path.join(ROOT, 'resumes', path.basename(r.resume_url)), () => {});
  await db('career_applications').where({ id: r.id }).del(); res.json({ success: true });
});

// ---------- member: their own applications only ----------
const memberShape = (r) => ({ id: r.id, job_id: r.job_id, job_title: r.job_title, job_slug: r.job_slug, department: r.department, location: r.location, experience: r.experience, status: r.status, status_note: r.status_note,
  resume_name: r.resume_name, cover_letter: r.cover_letter, created_at: r.created_at, updated_at: r.updated_at });
const mine = (req) => withJob().where('c.member_id', req.member.id).select('c.*', 'j.title as job_title', 'j.slug as job_slug', 'j.department', 'j.location');
exports.memberList = wrap(async (req, res) => {
  const q = mine(req); if (req.query.status) q.where('c.status', req.query.status);
  res.json({ success: true, data: (await q.orderBy('c.id', 'desc').limit(200)).map(memberShape) });
});
exports.memberGet = wrap(async (req, res) => { const r = await mine(req).where('c.id', req.params.id).first(); r ? res.json({ success: true, data: memberShape(r) }) : bad(res, 'Not found', 404); });
exports.memberCounts = async (memberId) => {
  const rows = await db('career_applications').where({ member_id: memberId }).select('status').count({ c: '*' }).groupBy('status');
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.c)]));
  return { total: Object.values(by).reduce((x, y) => x + y, 0), shortlisted: (by.shortlisted || 0) + (by.interview || 0) + (by.selected || 0), in_review: (by.new || 0) + (by.under_review || 0), rejected: by.rejected || 0 };
};
