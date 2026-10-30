const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'page_sections');
exports.down = (k) => k.schema.dropTableIfExists('page_sections');
