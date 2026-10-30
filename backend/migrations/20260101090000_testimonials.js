const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'testimonials');
exports.down = (k) => k.schema.dropTableIfExists('testimonials');
