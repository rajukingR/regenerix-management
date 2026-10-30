const r = require('express').Router();
const a = require('../controllers/auth');
const { requireAuth } = require('../config/auth');
r.post('/login', a.login);
r.get('/me', requireAuth, a.me);
r.put('/password', requireAuth, a.changePassword);
module.exports = r;
