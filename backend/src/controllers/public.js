const fs = require('fs');
const db = require('../config/db');
const m = require('../models');
const { notifyAdmins, notifyMember } = require('../models/notifications');
const { ownerId } = require('../models/members');
const { looksLikeResume } = require('../config/upload');
const { wrap } = require('./crud');
const { clean, isEmail, phoneOk, today } = require('../config/util');
const gone = (res, msg = 'Not found') => res.status(404).json({ message: msg });
const open = (j) => j && j.is_active && (!j.expires_on || String(j.expires_on).slice(0, 10) >= today());

// One request returns everything the public website renders. Only ACTIVE rows are included.
exports.site = wrap(async (req, res) => {
  const L = (k) => m[k].list({ active: true });
  const [settings, nav, pages, sections, services, packages, testimonials, team, stats, why, journey, faqs, blogs, jobs] =
    await Promise.all([m.settings.all(), L('nav'), L('pages'), L('sections'), L('services'), L('packages'), L('testimonials'), L('team'), L('stats'), L('why'), L('journey'), L('faqs'), L('blogs'), L('jobs')]);
  const t = today();
  const top = nav.filter((n) => !n.parent_id).map((n) => ({ ...n, children: nav.filter((c) => c.parent_id === n.id) })); // children of an inactive parent never appear
  const pub = Object.fromEntries(Object.entries(settings).filter(([k]) => !k.startsWith('private_'))); // keys starting private_ are never exposed
  res.json({ limits: { resume_mb: Number(process.env.RESUME_MAX_MB) || 5 }, settings: pub, nav: top, pages, sections, services, packages, testimonials, team, stats, why, journey, faqs,
    blogs: blogs.filter((b) => !b.published_at || String(b.published_at).slice(0, 10) <= t), jobs: jobs.filter(open) });
});
exports.page = wrap(async (req, res) => {
  const p = await m.pages.findBy('slug', req.params.slug);
  if (!p || !p.is_active) return gone(res, 'Page not available');
  res.json({ ...p, sections: (await m.sections.list({ active: true })).filter((s) => s.page_slug === p.slug) });
});
exports.list = (key) => wrap(async (req, res) => { const rows = await m[key].list({ active: true }); res.json(key === 'jobs' ? rows.filter(open) : rows); });
exports.bySlug = (key) => wrap(async (req, res) => { const r = await m[key].findBy('slug', req.params.slug); (key === 'jobs' ? open(r) : r && r.is_active) ? res.json(r) : gone(res); });

exports.contact = wrap(async (req, res) => {
  const b = req.body || {};
  if (!clean(b.name) || !isEmail(b.email) || !clean(b.phone)) return res.status(400).json({ message: 'Name, a valid email and phone are required' });
  await m.messages.create({ name: clean(b.name, 120), email: clean(b.email, 190), phone: clean(b.phone, 30), service: clean(b.service, 190), subject: clean(b.subject, 190), message: clean(b.message, 3000) });
  res.status(201).json({ ok: true });
});
exports.newsletter = wrap(async (req, res) => {
  const email = clean(req.body?.email, 190).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
  const ex = await m.subscribers.findBy('email', email);
  ex ? await m.subscribers.update(ex.id, { is_active: true }) : await m.subscribers.create({ email });
  res.status(201).json({ ok: true });
});

exports.apply = wrap(async (req, res) => {
  const b = req.body || {}, f = req.file, drop = () => f && fs.unlink(f.path, () => {});
  const fail = (code, message) => { drop(); return res.status(code).json({ success: false, message }); };
  if (!f) return fail(400, 'Upload your resume as a PDF or DOCX file');
  if (!looksLikeResume(f)) return fail(400, 'The resume file is not a valid PDF or DOCX');
  const name = clean(b.name, 120), email = clean(b.email, 190).toLowerCase(), phone = clean(b.phone, 30);
  if (!name || !isEmail(email) || !phoneOk(phone)) return fail(400, 'Enter your name, a valid email and a valid mobile number');
  let job = null;
  if (b.job_id) { job = await m.jobs.find(Number(b.job_id)); if (!open(job)) return fail(400, 'This job is no longer accepting applications'); }
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const dup = await db('career_applications').where({ email }).where((q) => (job ? q.where({ job_id: job.id }) : q.whereNull('job_id'))).where('created_at', '>', since).first();
  if (dup) return fail(409, 'You have already applied. We will contact you soon.');
  const memberId = req.member ? req.member.id : await ownerId(null, email, phone); // linked to the member account when logged in (or same email + phone)
  try {
    const id = await db.transaction(async (trx) => {
      const [id] = await trx('career_applications').insert({ job_id: job ? job.id : null, name, email, phone, experience: clean(b.experience, 40) || null, cover_letter: clean(b.cover_letter, 3000) || null,
        resume_url: `/uploads/resumes/${f.filename}`, resume_name: clean(f.originalname, 190), status: 'new', member_id: memberId });
      await notifyAdmins(trx, 'job_application', 'A new job application has been received.', { application_id: id, candidate_name: name, job_id: job ? job.id : null, job_title: job ? job.title : null });
      if (memberId) await notifyMember(trx, memberId, 'application_status', `Your application for ${job ? job.title : 'a role at Regenerix'} has been received. We will update you here once your resume is reviewed.`, { application_id: id, job_title: job ? job.title : null, status: 'new' });
      return id;
    });
    res.status(201).json({ success: true, id });
  } catch (e) { drop(); throw e; }
});
