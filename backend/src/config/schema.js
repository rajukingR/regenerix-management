// One definition per table. Each migration file calls build(knex, tableName).
const ACTIVE = ['nav_items', 'pages', 'page_sections', 'services', 'packages', 'testimonials', 'team_members', 'stats', 'why_cards', 'journey_steps', 'faqs', 'blogs', 'jobs', 'newsletter_subscribers'];
const S = (t, n, l = 255) => t.string(n, l);
const T = {
  admins: (t) => { S(t, 'name', 120); S(t, 'email', 190).notNullable().unique(); S(t, 'password').notNullable(); S(t, 'role', 30).defaultTo('admin'); },
  settings: (t) => { S(t, 'setting_key', 120).notNullable().unique(); t.text('setting_value'); },
  media: (t) => { S(t, 'filename').notNullable(); S(t, 'original_name'); S(t, 'url').notNullable(); S(t, 'mimetype', 80); t.enu('kind', ['image', 'video']).notNullable(); t.integer('size').defaultTo(0); },
  nav_items: (t) => { S(t, 'label', 120).notNullable(); S(t, 'path', 190); t.integer('parent_id').unsigned().nullable(); },
  pages: (t) => { S(t, 'slug', 120).notNullable().unique(); S(t, 'title', 190).notNullable(); S(t, 'subtitle'); S(t, 'banner_url'); S(t, 'meta_title', 190); S(t, 'meta_description', 300); },
  page_sections: (t) => { S(t, 'page_slug', 120).notNullable().index(); S(t, 'section_key', 120).notNullable(); S(t, 'title'); t.text('subtitle'); t.text('body'); S(t, 'image_url'); S(t, 'video_url'); t.json('extra'); t.unique(['page_slug', 'section_key']); },
  services: (t) => { S(t, 'slug', 120).notNullable().unique(); S(t, 'name', 190).notNullable(); t.text('short_text'); t.text('row_text'); t.text('long_text'); S(t, 'image_url'); S(t, 'video_url'); t.json('points'); },
  packages: (t) => { S(t, 'name', 190).notNullable(); S(t, 'subtitle'); S(t, 'duration', 60); t.text('description'); },
  testimonials: (t) => { S(t, 'name', 120).notNullable(); S(t, 'role', 120); t.text('quote'); S(t, 'image_url'); S(t, 'video_url'); },
  team_members: (t) => { S(t, 'slug', 120).notNullable().unique(); S(t, 'name', 120).notNullable(); S(t, 'role'); S(t, 'lead_text', 300); t.text('bio'); S(t, 'image_url'); },
  stats: (t) => { S(t, 'label', 120).notNullable(); t.integer('amount').defaultTo(0); S(t, 'suffix', 10); },
  why_cards: (t) => { S(t, 'title', 190).notNullable(); t.text('description'); t.json('bullets'); },
  journey_steps: (t) => { S(t, 'title', 190).notNullable(); t.text('description'); },
  faqs: (t) => { S(t, 'question').notNullable(); t.text('answer'); },
  blogs: (t) => { S(t, 'slug', 160).notNullable().unique(); S(t, 'title').notNullable(); t.text('excerpt'); t.text('body', 'longtext'); S(t, 'image_url'); S(t, 'video_url'); t.date('published_at'); },
  jobs: (t) => { S(t, 'slug', 160).notNullable().unique(); S(t, 'title').notNullable(); S(t, 'qualification', 120); S(t, 'location', 120); S(t, 'image_url'); t.text('intro'); t.json('responsibilities'); t.json('requirements'); t.date('posted_on'); t.date('expires_on'); S(t, 'category', 80); S(t, 'salary', 80); S(t, 'experience', 80); S(t, 'gender', 40); },
  contact_messages: (t) => { S(t, 'name', 120); S(t, 'email', 190); S(t, 'phone', 30); S(t, 'service', 190); S(t, 'subject', 190); t.text('message'); S(t, 'status', 20).defaultTo('new'); },
  career_applications: (t) => { t.integer('job_id').unsigned().nullable(); S(t, 'name', 120); S(t, 'email', 190); S(t, 'phone', 30); S(t, 'experience', 40); S(t, 'resume_url'); S(t, 'status', 20).defaultTo('new'); },
  newsletter_subscribers: (t) => { S(t, 'email', 190).notNullable().unique(); },
};
exports.TABLES = Object.keys(T);
exports.build = (k, name) => k.schema.createTable(name, (t) => {
  t.increments('id'); T[name](t);
  if (ACTIVE.includes(name)) { t.boolean('is_active').notNullable().defaultTo(true); t.integer('sort_order').notNullable().defaultTo(0); }
  t.timestamps(true, true);
});
