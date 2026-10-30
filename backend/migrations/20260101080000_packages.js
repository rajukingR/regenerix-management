const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'packages');
exports.down = (k) => k.schema.dropTableIfExists('packages');
