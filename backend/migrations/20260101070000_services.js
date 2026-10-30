const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'services');
exports.down = (k) => k.schema.dropTableIfExists('services');
