const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'admins');
exports.down = (k) => k.schema.dropTableIfExists('admins');
