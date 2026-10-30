const fs = require('fs'), path = require('path');
const m = require('../models');
const { ROOT } = require('../config/upload');
const { wrap } = require('./crud');
const fileOf = (url) => path.join(ROOT, path.basename(path.dirname(url)), path.basename(url));
exports.list = wrap(async (req, res) => { const all = await m.media.list(); res.json(req.query.kind ? all.filter((x) => x.kind === req.query.kind) : all); });
exports.upload = wrap(async (req, res) => {
  const out = [], skipped = [];
  for (const f of req.files || []) {
    const kind = f.mimetype.startsWith('video') ? 'video' : 'image';
    if (kind === 'image' && f.size > 10 * 1024 * 1024) { fs.unlink(f.path, () => {}); skipped.push(f.originalname); continue; } // images are capped at 10 MB, videos at 200 MB
    out.push(await m.media.create({ filename: f.filename, original_name: f.originalname.slice(0, 190), url: `/uploads/${kind}s/${f.filename}`, mimetype: f.mimetype, kind, size: f.size }));
  }
  res.status(201).json({ files: out, skipped });
});
exports.remove = wrap(async (req, res) => {
  const r = await m.media.find(req.params.id);
  if (!r) return res.status(404).json({ message: 'Not found' });
  fs.unlink(fileOf(r.url), () => {}); await m.media.remove(r.id); res.json({ ok: true });
});
