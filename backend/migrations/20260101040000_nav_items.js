const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'nav_items');
exports.down = (k) => k.schema.dropTableIfExists('nav_items');
