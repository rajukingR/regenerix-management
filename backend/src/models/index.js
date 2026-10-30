const db = require('../config/db');
const JSON_COLS = { services: ['points'], why_cards: ['bullets'], jobs: ['responsibilities', 'requirements'], page_sections: ['extra'] };
const READ_ONLY = ['id', 'created_at', 'updated_at'];
const cache = {};
const columns = async (t) => (cache[t] ||= Object.keys(await db(t).columnInfo()));

const dec = (t, row) => {
  if (!row) return row;
  for (const c of JSON_COLS[t] || []) {
    if (typeof row[c] === 'string') { try { row[c] = JSON.parse(row[c]); } catch { row[c] = null; } }
    if (row[c] == null) row[c] = c === 'extra' ? {} : [];
  }
  if ('is_active' in row) row.is_active = !!row.is_active;
  return row;
};
const enc = async (t, data = {}) => {
  const out = {};
  for (const c of (await columns(t)).filter((x) => !READ_ONLY.includes(x))) {
    let v = data[c]; if (v === undefined) continue;
    if ((JSON_COLS[t] || []).includes(c)) v = JSON.stringify(v ?? (c === 'extra' ? {} : []));
    else if (c === 'is_active') v = v ? 1 : 0;
    else if (c === 'sort_order' || c === 'amount' || c === 'size') v = Number(v) || 0;
    else if (/(_id|_on|_at)$/.test(c) && v === '') v = null;
    out[c] = v;
  }
  return out;
};
const make = (table, order = [['sort_order', 'asc'], ['id', 'asc']]) => ({
  table,
  async list({ active } = {}) { const q = db(table); if (active) q.where('is_active', 1); order.forEach(([c, d]) => q.orderBy(c, d)); return (await q).map((r) => dec(table, r)); },
  async find(id) { return dec(table, await db(table).where({ id }).first()); },
  async findBy(col, val) { return dec(table, await db(table).where({ [col]: val }).first()); },
  async create(data) { const [id] = await db(table).insert(await enc(table, data)); return this.find(id); },
  async update(id, data) { const d = await enc(table, data); if (Object.keys(d).length) await db(table).where({ id }).update({ ...d, updated_at: db.fn.now() }); return this.find(id); },
  async toggle(id) { const r = await this.find(id); return r ? this.update(id, { is_active: !r.is_active }) : null; },
  async remove(id) { return db(table).where({ id }).del(); },
});
const byId = [['id', 'asc']], newest = [['id', 'desc']];
module.exports = {
  nav: make('nav_items'), pages: make('pages'), sections: make('page_sections'), services: make('services'), packages: make('packages'),
  testimonials: make('testimonials'), team: make('team_members'), stats: make('stats'), why: make('why_cards'), journey: make('journey_steps'),
  faqs: make('faqs'), blogs: make('blogs', [['published_at', 'desc'], ['id', 'desc']]), jobs: make('jobs'),
  messages: make('contact_messages', newest), applications: make('career_applications', newest), subscribers: make('newsletter_subscribers', newest),
  media: make('media', newest), admins: make('admins', byId),
  settings: {
    async all() { return Object.fromEntries((await db('settings')).map((r) => [r.setting_key, r.setting_value])); },
    async set(k, v) {
      const key = String(k).slice(0, 120), val = v == null ? null : String(v);
      if (await db('settings').where({ setting_key: key }).first()) await db('settings').where({ setting_key: key }).update({ setting_value: val, updated_at: db.fn.now() });
      else await db('settings').insert({ setting_key: key, setting_value: val });
    },
  },
};
