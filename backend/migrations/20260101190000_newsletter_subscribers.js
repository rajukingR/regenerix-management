const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'newsletter_subscribers');
exports.down = (k) => k.schema.dropTableIfExists('newsletter_subscribers');
