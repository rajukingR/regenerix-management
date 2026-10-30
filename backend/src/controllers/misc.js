const path = require('path');
const db = require('../config/db');
const m = require('../models');
const { ROOT } = require('../config/upload');
const { wrap } = require('./crud');
const count = async (t, where = {}) => Number((await db(t).where(where).count({ c: '*' }).first()).c);
exports.settingsGet = wrap(async (req, res) => res.json(await m.settings.all()));
exports.settingsPut = wrap(async (req, res) => { for (const [k, v] of Object.entries(req.body || {})) await m.settings.set(k, v); res.json(await m.settings.all()); });
exports.dashboard = wrap(async (req, res) => {
  const content = {};
  for (const [key, table] of [['pages', 'pages'], ['services', 'services'], ['packages', 'packages'], ['testimonials', 'testimonials'], ['team', 'team_members'], ['blogs', 'blogs'], ['jobs', 'jobs'], ['faqs', 'faqs']])
    content[key] = { total: await count(table), active: await count(table, { is_active: 1 }) };
  res.json({ content, inbox: { messages: await count('contact_messages', { status: 'new' }), applications: await count('career_applications', { status: 'new' }), appointments: await count('appointments', { status: 'pending' }), subscribers: await count('newsletter_subscribers', { is_active: 1 }) }, media: await count('media'),
    portal: { doctors: await count('admins', { role: 'doctor' }), members: await count('members'), unassigned: Number((await db('appointments').whereNull('assigned_to').whereIn('status', ['pending', 'confirmed', 'rescheduled']).count({ c: '*' }).first()).c),
      appointments_total: await count('appointments'), completed: await count('appointments', { status: 'completed' }), rejected: await count('appointments', { status: 'rejected' }), shortlisted: await count('career_applications', { status: 'shortlisted' }), applications_total: await count('career_applications') } });
});
// Resumes are private: served only to a logged-in admin, never as static files
exports.resume = wrap(async (req, res) => {
  const a = await m.applications.find(req.params.id);
  if (!a || !a.resume_url) return res.status(404).json({ message: 'Not found' });
  res.download(path.join(ROOT, 'resumes', path.basename(a.resume_url)), `${a.name.replace(/[^\w-]+/g, '_')}-resume${path.extname(a.resume_url)}`);
});
