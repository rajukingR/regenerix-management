const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'stats');
exports.down = (k) => k.schema.dropTableIfExists('stats');
