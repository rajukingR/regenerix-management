const { build } = require('../src/config/schema');
exports.up = (k) => build(k, 'pages');
exports.down = (k) => k.schema.dropTableIfExists('pages');
