const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (res) => res.status(404).json({ message: 'Not found' });
// Generic CRUD handlers for any model
exports.wrap = wrap;
exports.crud = (m) => ({
  list: wrap(async (req, res) => res.json(await m.list())),
  get: wrap(async (req, res) => { const r = await m.find(req.params.id); r ? res.json(r) : notFound(res); }),
  create: wrap(async (req, res) => res.status(201).json(await m.create(req.body))),
  update: wrap(async (req, res) => { if (!(await m.find(req.params.id))) return notFound(res); res.json(await m.update(req.params.id, req.body)); }),
  toggle: wrap(async (req, res) => { const r = await m.toggle(req.params.id); r ? res.json(r) : notFound(res); }),
  remove: wrap(async (req, res) => { (await m.remove(req.params.id)) ? res.json({ ok: true }) : notFound(res); }),
});
