const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'career_applications');
exports.down = (k) => k.schema.dropTableIfExists('career_applications');
