const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'blogs');
exports.down = (k) => k.schema.dropTableIfExists('blogs');
