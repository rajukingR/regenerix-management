require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Kolkata'; // appointment slots follow the clinic's local time
const express = require('express'), cors = require('cors'), helmet = require('helmet'), rateLimit = require('express-rate-limit'), path = require('path');
const { ROOT } = require('./config/upload');
if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.'); process.exit(1); }
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // lets the React site load uploaded images/videos
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));
// Only images and videos are public. Resumes are never served statically.
app.use('/uploads/images', express.static(path.join(ROOT, 'images'), { maxAge: '7d' }));
app.use('/uploads/videos', express.static(path.join(ROOT, 'videos'), { maxAge: '7d' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), require('./routes/auth'));
app.use('/api/public', rateLimit({ windowMs: 60 * 1000, max: 120 }), require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/member', require('./routes/member'));
app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const dup = err.code === 'ER_DUP_ENTRY' || /UNIQUE constraint/.test(err.message || '');
  const status = dup ? 409 : err.code === 'LIMIT_FILE_SIZE' ? 413 : err.name === 'MulterError' || /Unsupported file/.test(err.message || '') ? 400 : err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: dup ? 'That value already exists (duplicate slug or email)' : status === 500 ? 'Server error' : err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message });
});
const port = process.env.PORT || 5000;
const server = app.listen(port, () => console.log(`Regenerix API on http://localhost:${port}`));
server.requestTimeout = 15 * 60 * 1000; // allow large video uploads on slow connections
