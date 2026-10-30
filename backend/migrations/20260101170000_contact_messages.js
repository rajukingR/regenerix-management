const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'contact_messages');
exports.down = (k) => k.schema.dropTableIfExists('contact_messages');
