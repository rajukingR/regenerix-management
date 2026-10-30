const multer = require('multer'), path = require('path'), fs = require('fs'), crypto = require('crypto');
const ROOT = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TYPES = { 'image/jpeg': ['images', '.jpg'], 'image/png': ['images', '.png'], 'image/webp': ['images', '.webp'], 'image/gif': ['images', '.gif'],
  'video/mp4': ['videos', '.mp4'], 'video/webm': ['videos', '.webm'], 'video/quicktime': ['videos', '.mov'], 'application/pdf': ['resumes', '.pdf'], [DOCX]: ['resumes', '.docx'] };
const storage = multer.diskStorage({
  destination: (req, f, cb) => { const d = path.join(ROOT, TYPES[f.mimetype][0]); fs.mkdirSync(d, { recursive: true }); cb(null, d); },
  filename: (req, f, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${TYPES[f.mimetype][1]}`), // extension comes from the checked mimetype, never from the client filename
});
const only = (kinds) => (req, f, cb) => (TYPES[f.mimetype] && kinds.includes(TYPES[f.mimetype][0]) ? cb(null, true) : cb(new Error('Unsupported file type')));
exports.ROOT = ROOT;
exports.media = multer({ storage, fileFilter: only(['images', 'videos']), limits: { fileSize: 200 * 1024 * 1024, files: 10 } });
exports.resume = multer({ storage, fileFilter: only(['resumes']), limits: { fileSize: (Number(process.env.RESUME_MAX_MB) || 5) * 1024 * 1024, files: 1 } });
// The mimetype comes from the client, so also check the file's real signature: PDF starts "%PDF", DOCX is a zip ("PK").
exports.looksLikeResume = (f) => {
  const b = Buffer.alloc(4); const fd = fs.openSync(f.path, 'r'); fs.readSync(fd, b, 0, 4, 0); fs.closeSync(fd);
  return f.mimetype === 'application/pdf' ? b.toString('latin1') === '%PDF' : b[0] === 0x50 && b[1] === 0x4b;
};
