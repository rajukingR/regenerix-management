const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'jobs');
exports.down = (k) => k.schema.dropTableIfExists('jobs');
