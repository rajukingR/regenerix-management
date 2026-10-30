const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'settings');
exports.down = (k) => k.schema.dropTableIfExists('settings');
