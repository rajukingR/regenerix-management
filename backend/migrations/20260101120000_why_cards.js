const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'why_cards');
exports.down = (k) => k.schema.dropTableIfExists('why_cards');
