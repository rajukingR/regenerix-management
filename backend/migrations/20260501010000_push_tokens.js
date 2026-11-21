// Browser push (Firebase Cloud Messaging). One row per browser per portal. Additive only.
exports.up = (k) => k.schema.createTable('push_tokens', (t) => {
  t.increments('id');
  t.string('audience', 10).notNullable(); // 'staff' = user_id is admins.id, 'member' = user_id is members.id (same as notifications.audience)
  t.integer('user_id').unsigned().notNullable();
  t.string('portal', 10).notNullable(); // admin | doctor | member: decides which page a click opens
  t.string('token', 512).notNullable();
  t.string('user_agent', 255);
  t.timestamps(true, true);
  t.unique(['token', 'portal']); t.index(['audience', 'user_id']);
});
exports.down = (k) => k.schema.dropTableIfExists('push_tokens');
