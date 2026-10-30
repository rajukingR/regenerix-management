// One entry per content type. The generic ResourcePage builds its table and form from this.
const T = (n, label, extra = {}) => ({ n, label, t: 'text', ...extra })
const TA = (n, label, rows = 4) => ({ n, label, t: 'textarea', rows })
const IMG = (n = 'image_url', label = 'Image') => ({ n, label, t: 'image' })
const VID = (n = 'video_url', label = 'Video') => ({ n, label, t: 'video' })
const NUM = (n, label) => ({ n, label, t: 'number' })
const LIST = (n, label) => ({ n, label, t: 'list' })
const SORT = NUM('sort_order', 'Sort order')

export const RESOURCES = {
  pages: { title: 'Pages', api: 'pages', cols: ['title', 'slug', 'banner_url'], fields: [T('slug', 'Slug (URL)', { req: 1 }), T('title', 'Title', { req: 1 }), T('subtitle', 'Subtitle'), IMG('banner_url', 'Banner image'), T('meta_title', 'SEO title'), T('meta_description', 'SEO description'), SORT] },
  'nav-items': { title: 'Navigation', api: 'nav-items', cols: ['label', 'path', 'parent_id', 'sort_order'], fields: [T('label', 'Label', { req: 1 }), T('path', 'Link path (e.g. /about)'), NUM('parent_id', 'Parent item ID (blank = top level)'), SORT] },
  sections: { title: 'Page sections', api: 'sections', cols: ['page_slug', 'section_key', 'title', 'image_url'], fields: [T('page_slug', 'Page slug', { req: 1 }), T('section_key', 'Section key', { req: 1 }), T('title', 'Title'), TA('subtitle', 'Subtitle', 2), TA('body', 'Body', 6), IMG(), VID(), { n: 'extra', label: 'Extra data (JSON, optional)', t: 'json' }, SORT] },
  services: { title: 'Services', api: 'services', cols: ['name', 'slug', 'image_url'], fields: [T('slug', 'Slug (URL)', { req: 1 }), T('name', 'Name', { req: 1 }), TA('short_text', 'Short text', 3), TA('row_text', 'Row text', 3), TA('long_text', 'Long text', 5), LIST('points', 'Included points (one per line)'), IMG(), VID(), SORT] },
  packages: { title: 'Packages', api: 'packages', cols: ['name', 'subtitle', 'duration'], fields: [T('name', 'Name', { req: 1 }), T('subtitle', 'Subtitle'), T('duration', 'Duration'), TA('description', 'Description'), SORT] },
  testimonials: { title: 'Testimonials', api: 'testimonials', cols: ['name', 'role', 'quote'], fields: [T('name', 'Name', { req: 1 }), T('role', 'Role'), TA('quote', 'Quote'), IMG(), VID(), SORT] },
  team: { title: 'Team', api: 'team', cols: ['name', 'role', 'image_url'], fields: [T('slug', 'Slug', { req: 1 }), T('name', 'Name', { req: 1 }), T('role', 'Role'), T('lead_text', 'Card text'), TA('bio', 'Bio'), IMG(), SORT] },
  stats: { title: 'Stats', api: 'stats', cols: ['label', 'amount', 'suffix'], fields: [T('label', 'Label', { req: 1 }), NUM('amount', 'Number'), T('suffix', 'Suffix (+, K, K+)'), SORT] },
  why: { title: 'Why choose us', api: 'why', cols: ['title', 'description'], fields: [T('title', 'Title', { req: 1 }), TA('description', 'Description', 3), LIST('bullets', 'Bullets (one per line)'), SORT] },
  journey: { title: 'Journey steps', api: 'journey', cols: ['title', 'description'], fields: [T('title', 'Title', { req: 1 }), TA('description', 'Description'), SORT] },
  faqs: { title: 'FAQs', api: 'faqs', cols: ['question'], fields: [T('question', 'Question', { req: 1 }), TA('answer', 'Answer'), SORT] },
  blogs: { title: 'Blogs', api: 'blogs', cols: ['title', 'published_at', 'image_url'], fields: [T('slug', 'Slug (URL)', { req: 1 }), T('title', 'Title', { req: 1 }), TA('excerpt', 'Excerpt', 3), TA('body', 'Body (blank line between paragraphs)', 12), IMG(), VID(), { n: 'published_at', label: 'Publish date', t: 'date' }] },
  jobs: { title: 'Jobs', api: 'jobs', cols: ['title', 'department', 'location', 'employment_type', 'expires_on'], fields: [T('slug', 'Slug (URL)', { req: 1 }), T('title', 'Title', { req: 1 }), T('department', 'Department'), T('employment_type', 'Employment type (Full-time, Part-time...)'), T('qualification', 'Qualification'), T('location', 'Location'), IMG(), TA('intro', 'Description'), LIST('responsibilities', 'Responsibilities (one per line)'), LIST('requirements', 'Requirements (one per line)'),
    { n: 'posted_on', label: 'Posted on', t: 'date' }, { n: 'expires_on', label: 'Expires on', t: 'date' }, T('category', 'Category'), T('salary', 'Salary'), T('experience', 'Experience'), T('gender', 'Gender'), SORT] },
}
export const CONTENT = ['pages', 'nav-items', 'sections', 'services', 'packages', 'testimonials', 'team', 'stats', 'why', 'journey', 'faqs', 'blogs', 'jobs']
