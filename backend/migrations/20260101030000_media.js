const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'media');
exports.down = (k) => k.schema.dropTableIfExists('media');
