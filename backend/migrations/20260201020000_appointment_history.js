exports.up = (k) => k.schema.createTable('appointment_history', (t) => {
  t.increments('id'); t.integer('appointment_id').unsigned().notNullable().index();
  t.string('action', 30).notNullable(); t.text('note'); t.integer('admin_id').unsigned().nullable();
  t.timestamp('created_at').defaultTo(k.fn.now());
});
exports.down = (k) => k.schema.dropTableIfExists('appointment_history');
