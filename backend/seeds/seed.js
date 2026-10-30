// Loads the current website content (src/data.js) into MySQL. Safe to re-run: a table is only filled when it is empty.
require('dotenv').config();
const bcrypt = require('bcryptjs'), crypto = require('crypto');
const db = require('../src/config/db');
const m = require('../src/models');
const empty = async (t) => !(await db(t).first());
const ensureSetting = async (k, v) => { if (!(await db('settings').where({ setting_key: k }).first())) await m.settings.set(k, v); };
// Adds a section only if it is missing, so re-running the seed never overwrites what an admin edited.
const ensureSection = async (page_slug, section_key, o, i = 0) => {
  const ex = await db('page_sections').where({ page_slug, section_key }).first();
  if (!ex) return m.sections.create({ page_slug, section_key, sort_order: i, ...o });
  const cur = typeof ex.extra === 'string' ? JSON.parse(ex.extra || '{}') : ex.extra || {};
  if (o.extra && !Object.keys(cur).length) await m.sections.update(ex.id, { extra: o.extra });
};

(async () => {
  const D = require('./seedData');
  if (await empty('admins')) {
    const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const email = (process.env.ADMIN_EMAIL || 'admin@theregenerix.com').toLowerCase();
    await m.admins.create({ name: 'Admin', email, password: await bcrypt.hash(pw, 12) });
    console.log(`Admin created -> ${email} / ${process.env.ADMIN_PASSWORD ? '(password from .env)' : pw}`);
  }
  if (await empty('settings')) {
    const S = D.SITE, set = { site_name: `${S.name} – ${S.tag}`, phone: S.phone, phone_tel: S.tel, email: S.email, address: S.address, hours_weekdays: S.hours[0][1], hours_sunday: S.hours[1][1],
      logo_url: S.logo, logo_light_url: S.logo2, whatsapp_message: decodeURIComponent(D.waLink().split('text=')[1]) };
    S.social.forEach(([n, u]) => { set[`social_${n.toLowerCase()}`] = u; });
    for (const [k, v] of Object.entries(set)) await m.settings.set(k, v);
  }
  if (await empty('nav_items')) {
    let i = 0;
    for (const [p, label] of D.NAV) {
      const n = await m.nav.create({ label, path: p, sort_order: ++i });
      if (label === 'Service') { let j = 0; for (const s of D.SERVICES) await m.nav.create({ label: s.name, path: `/${s.slug}`, parent_id: n.id, sort_order: ++j }); }
    }
  }
  if (await empty('pages')) {
    const pages = [['home', 'Home'], ['about', 'About'], ['service', 'Service'], ['careers', 'Career'], ['career-form', 'Career Form'], ['blogs', 'Blogs'], ['contact-us', 'Contact Us'], ['team-detail', 'Our Team'], ['faqs', 'Faqs'],
      ['privacy-policy', 'Privacy Policy'], ['terms-and-condition', 'Terms & Condition'], ['refund-and-returns-policy', 'Refund and Returns Policy']];
    let i = 0; for (const [slug, title] of pages) await m.pages.create({ slug, title, banner_url: D.BANNER, meta_title: `${title} | Regenerix`, sort_order: ++i });
  }
  if (await empty('services')) { let i = 0; for (const s of D.SERVICES) await m.services.create({ slug: s.slug, name: s.name, short_text: s.short, row_text: D.ROWS[s.slug], long_text: s.long, image_url: s.img, points: s.points, sort_order: ++i }); }
  if (await empty('packages')) { let i = 0; for (const p of D.PACKAGES) await m.packages.create({ name: p.name, subtitle: p.sub, duration: p.dur, description: p.text, sort_order: ++i }); }
  if (await empty('testimonials')) { let i = 0; for (const t of D.TESTIMONIALS) await m.testimonials.create({ ...t, sort_order: ++i }); }
  if (await empty('team_members')) { let i = 0; for (const t of D.TEAM) await m.team.create({ slug: t.id, name: t.name, role: t.role, lead_text: D.LEADS[t.id], bio: t.bio, image_url: t.img, sort_order: ++i }); }
  if (await empty('stats')) { let i = 0; for (const [label, amount, suffix] of D.STATS) await m.stats.create({ label, amount, suffix, sort_order: ++i }); }
  if (await empty('why_cards')) { let i = 0; for (const [title, description, bullets] of D.WHY2) await m.why.create({ title, description, bullets, sort_order: ++i }); }
  if (await empty('journey_steps')) { let i = 0; for (const [title, description] of D.STEPS) await m.journey.create({ title, description, sort_order: ++i }); }
  if (await empty('faqs')) { let i = 0; for (const [question, answer] of D.FAQS) await m.faqs.create({ question, answer, sort_order: ++i }); }
  if (await empty('blogs')) for (const b of D.BLOGS) await m.blogs.create({ slug: b.slug, title: b.title, excerpt: b.excerpt, body: b.body.join('\n\n'), image_url: b.img, published_at: '2026-10-26' });
  if (await empty('jobs')) {
    const d = Object.fromEntries(D.CAREER.details);
    await m.jobs.create({ slug: 'physiotherapy-consultant', title: D.CAREER.title, qualification: D.JOB.qual, location: d.Location, image_url: '/img/job.jpg', intro: D.CAREER.intro.join(''),
      responsibilities: D.CAREER.duties, requirements: D.CAREER.reqs, department: 'Physiotherapy', employment_type: 'Full-time', posted_on: '2026-10-20', expires_on: '2027-01-15', category: d.Category, salary: d.Salary, experience: d.Experience, gender: d.Gender });
  }
  const settings = { default_banner_url: '/img/banner.jpg', short_address: 'Electronic City Phase I, Bangalore', footer_text: 'Regenerix provides trusted regenerative healthcare solutions, personalized treatment, expert care, and holistic wellness services.', slot_start: '07:00', slot_end: '22:00', slot_minutes: '30', slot_sunday_start: '09:00', slot_sunday_end: '13:00', booking_days_ahead: '60' };
  for (const [k, v] of Object.entries(settings)) await ensureSetting(k, v);
  const shock = { tags: ['Radial Shock Wave', 'Focused Shock Wave', 'Modular Technology'], why_title: 'Why DUOLITH® SD1 »ultra«?', why_body: 'Advanced rehabilitation demands more than one approach. The system brings radial and focused shock wave therapy together within a modular platform, with optional diagnostic ultrasound capabilities.',
    achieve_title: 'What We Help You Achieve', achievements: [['Restore Movement', 'Improve mobility and functional capacity.'], ['Recover Function', 'Address musculoskeletal conditions and post-surgical needs.'], ['Rebuild Strength', 'Develop physical capacity, resilience, and confidence.'], ['Return to Performance', 'Progress towards sport, work, and everyday activities.'], ['Support Longevity', 'Maintain strength, mobility, and independence over time.']] };
  const aboutBody = 'At Regenerix, we go beyond treating symptoms. Through comprehensive assessment, movement analysis, and personalised musculoskeletal care, we identify the factors influencing your pain, movement, and physical performance.';
  await ensureSection('home', 'hero', { title: 'Precision Care for Rehabilitation, Regeneration & Longevity', body: 'Evidence-based physiotherapy and rehabilitation, tailored to your body, needs, and goals, beginning with a comprehensive assessment.', image_url: '/img/hero.jpg' }, 1);
  await ensureSection('home', 'about', { title: 'We Look Beyond the Pain We find out why.', body: aboutBody, image_url: '/img/about.jpg' }, 2);
  await ensureSection('home', 'shockwave', { title: 'Advanced Shock Wave Technology. Now at Regenerix.', subtitle: 'One System. Multiple Possibilities. Precision-Led Care.', body: 'Regenerix brings advanced extracorporeal shock wave therapy to its rehabilitation ecosystem with the DUOLITH® SD1 »ultra« by STORZ MEDICAL, combining radial and focused shock wave technologies in one modular platform.', extra: shock }, 3);
  await ensureSection('home', 'why', { title: 'Why Choose Us for Thoughtful Life Guidance', image_url: '/img/why.jpg' }, 4);
  await ensureSection('about', 'intro', { title: 'Recovery. Performance. Longevity.', body: 'At Regenerix, we deliver precision-led, evidence-based rehabilitation tailored to your unique needs and long-term goals. Through comprehensive clinical assessment, individualised treatment, and progressive movement strategies, we aim to restore optimal function, elevate physical performance, and support lasting musculoskeletal health.' }, 1);
  await ensureSection('about', 'story', { title: 'We Look Beyond the Pain We find out why.', body: aboutBody + ' This allows us to build evidence-informed care plans tailored to your needs, goals, and long-term health.', image_url: '/img/about.jpg' }, 2);
  await ensureSection('about', 'mission', { title: 'Our Mission', body: 'To help people move better, perform at their best, and age well through evidence-based rehabilitation, personalised musculoskeletal care, and proactive health strategies.' }, 3);
  await ensureSection('about', 'vision', { title: 'Our Vision', body: 'To redefine musculoskeletal healthcare by integrating rehabilitation, regeneration, and longevity-focused care, helping people live healthier lives at every stage.' }, 4);
  for (const [slug, [title, paras]] of Object.entries(D.POLICIES)) await ensureSection(slug, 'content', { title, body: paras.join('\n\n') }, 1);
  console.log('Seed complete.');
  await db.destroy();
})().catch((e) => { console.error(e); process.exit(1); });
