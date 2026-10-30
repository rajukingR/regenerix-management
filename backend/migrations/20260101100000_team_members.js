const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'team_members');
exports.down = (k) => k.schema.dropTableIfExists('team_members');
