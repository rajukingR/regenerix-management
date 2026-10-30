const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'faqs');
exports.down = (k) => k.schema.dropTableIfExists('faqs');
