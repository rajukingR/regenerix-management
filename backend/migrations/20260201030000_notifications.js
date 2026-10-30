exports.up = (k) => k.schema.createTable('notifications', (t) => {
  t.increments('id');
  t.integer('user_id').unsigned().notNullable().index();
  t.text('message').notNullable();
  t.string('message_type', 100).notNullable();
  t.boolean('is_read').notNullable().defaultTo(false); // tinyint(1): 0 unread, 1 read
  t.timestamp('created_at').defaultTo(k.fn.now());
  t.json('detail');
  t.string('photo', 255);
  t.index(['user_id', 'is_read']);
});
exports.down = (k) => k.schema.dropTableIfExists('notifications');
