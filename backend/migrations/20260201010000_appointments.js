exports.up = (k) => k.schema.createTable('appointments', (t) => {
  t.increments('id');
  t.string('reference', 20).notNullable().unique();
  t.string('name', 120).notNullable(); t.string('email', 190).notNullable(); t.string('phone', 30).notNullable();
  t.string('service', 190); t.integer('team_id').unsigned().nullable();
  t.date('appointment_date').notNullable(); t.string('appointment_time', 5).notNullable();
  t.text('reason'); t.text('notes');
  t.string('status', 20).notNullable().defaultTo('pending').index();
  // "date|time" while the booking holds a slot, NULL once cancelled / no-show. The UNIQUE index makes double booking impossible even under concurrent requests.
  t.string('slot_key', 60).nullable().unique();
  t.index(['appointment_date']); t.timestamps(true, true);
});
exports.down = (k) => k.schema.dropTableIfExists('appointments');
