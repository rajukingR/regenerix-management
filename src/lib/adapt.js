// Turns the API response into the shapes the page components render. Pure function: no network, no fallbacks.
const NAMES = { x: 'X', youtube: 'YouTube', linkedin: 'LinkedIn' }
const nice = (k) => NAMES[k] || k.charAt(0).toUpperCase() + k.slice(1)
const paras = (s) => String(s || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)

export function adapt(raw = {}) {
  const st = raw.settings || {}, sections = raw.sections || [], list = (k) => raw[k] || []
  const sec = (page, key) => sections.find((s) => s.page_slug === page && s.section_key === key) || null
  const SITE = { name: st.site_name || '', phone: st.phone || '', tel: st.phone_tel || '', email: st.email || '', address: st.address || '', shortAddress: st.short_address || st.address || '', about: st.footer_text || '',
    logo: st.logo_url || '', logo2: st.logo_light_url || '', hours: [['Mon – Sat', st.hours_weekdays || ''], ['Sunday', st.hours_sunday || '']].filter(([, h]) => h),
    social: Object.entries(st).filter(([k, v]) => k.startsWith('social_') && v).map(([k, v]) => [nice(k.slice(7)), v]) }
  const POLICIES = {}
  for (const p of list('pages')) { const s = sec(p.slug, 'content'); if (s) POLICIES[p.slug] = [s.title || p.title, paras(s.body)] }
  return {
    SITE, sec, BANNER: st.default_banner_url || '', PAGES: list('pages'), JOBS: list('jobs'), POLICIES, LIMITS: { resumeMb: raw.limits?.resume_mb || 5 },
    waLink: (msg) => `https://wa.me/${SITE.tel}?text=${encodeURIComponent(msg ?? st.whatsapp_message ?? '')}`,
    SERVICES: list('services').map((s) => ({ slug: s.slug, name: s.name, img: s.image_url, video: s.video_url, short: s.short_text, long: s.long_text, points: s.points || [] })),
    ROWS: Object.fromEntries(list('services').map((s) => [s.slug, s.row_text])),
    PACKAGES: list('packages').map((p) => ({ name: p.name, sub: p.subtitle, dur: p.duration, text: p.description })),
    TESTIMONIALS: list('testimonials').map((t) => ({ name: t.name, role: t.role, quote: t.quote, video: t.video_url, image: t.image_url })),
    TEAM: list('team').map((t) => ({ dbId: t.id, id: t.slug, name: t.name, role: t.role, img: t.image_url, bio: t.bio })),
    LEADS: Object.fromEntries(list('team').map((t) => [t.slug, t.lead_text])),
    STATS: list('stats').map((s) => [s.label, s.amount, s.suffix || '']),
    WHY2: list('why').map((w) => [w.title, w.description, w.bullets || []]),
    STEPS: list('journey').map((j) => [j.title, j.description]),
    FAQS: list('faqs').map((f) => [f.question, f.answer]),
    BLOGS: list('blogs').map((b) => ({ slug: b.slug, title: b.title, date: b.published_at, img: b.image_url, video: b.video_url, excerpt: b.excerpt, body: paras(b.body) })),
  }
}
