const db = require('../config/db');
const push = require('../config/push');
const { wrap } = require('./crud');
const { clean } = require('../config/util');
const who = (req) => (req.member ? [req.member.id, 'member'] : [req.admin.id, 'staff']);
// Same endpoints for every portal: GET /push/status | POST /push/register {token} | POST /push/unregister {token} | POST /push/test
exports.mount = (r, portal) => {
  r.get('/push/status', wrap(async (req, res) => { const [id, aud] = who(req); res.json({ success: true, enabled: push.enabled(), devices: push.enabled() ? Number((await db('push_tokens').where({ audience: aud, user_id: id, portal }).count({ c: '*' }).first()).c) : 0 }); }));
  r.post('/push/register', wrap(async (req, res) => {
    if (!push.enabled()) return res.status(503).json({ success: false, message: 'Push notifications are not set up on the server yet' });
    const token = clean(req.body?.token, 512), [id, aud] = who(req);
    if (token.length < 20) return res.status(400).json({ success: false, message: 'Invalid device token' });
    const row = { audience: aud, user_id: id, user_agent: clean(req.headers['user-agent'], 255) || null, updated_at: db.fn.now() };
    // One row per browser per portal: signing in as someone else on the same browser moves the subscription to them.
    if (await db('push_tokens').where({ token, portal }).first()) await db('push_tokens').where({ token, portal }).update(row);
    else await db('push_tokens').insert({ ...row, token, portal });
    res.json({ success: true });
  }));
  r.post('/push/unregister', wrap(async (req, res) => { const [id, aud] = who(req); await db('push_tokens').where({ token: clean(req.body?.token, 512), portal, audience: aud, user_id: id }).del(); res.json({ success: true }); }));
  r.post('/push/test', wrap(async (req, res) => {
    const [id, aud] = who(req), out = await push.send(aud, [id], { type: 'test', message: 'This browser will now receive Regenerix notifications.' });
    if (out.sent) return res.json({ success: true, ...out });
    res.status(out.error ? 502 : 400).json({ success: false, message: out.error || 'No browser is registered for this account yet. Turn on push notifications first.' });
  }));
};
