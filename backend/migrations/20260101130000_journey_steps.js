const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'journey_steps');
exports.down = (k) => k.schema.dropTableIfExists('journey_steps');
