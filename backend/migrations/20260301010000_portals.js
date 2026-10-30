// Doctor + member portals. Additive only: new table `members`, new columns on existing tables. No data is dropped.
exports.up = async (k) => {
  // Doctor logins live in `admins` with role = 'doctor' and team_id -> team_members.id
  await k.schema.alterTable('admins', (t) => { t.integer('team_id').unsigned().nullable().index(); t.boolean('is_active').notNullable().defaultTo(true); t.string('phone', 30); });
  await k.schema.createTable('members', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable(); t.string('email', 190).notNullable().unique(); t.string('phone', 30).notNullable(); t.string('password').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true); t.timestamp('last_login_at').nullable();
    t.timestamps(true, true);
  });
  await k.schema.alterTable('appointments', (t) => {
    t.integer('member_id').unsigned().nullable().index(); // the member account that owns this booking
    t.integer('assigned_to').unsigned().nullable().index(); // team_members.id of the doctor the admin assigned
    t.timestamp('assigned_at').nullable();
  });
  await k.schema.alterTable('career_applications', (t) => { t.integer('member_id').unsigned().nullable().index(); t.text('status_note'); });
  // 'staff' = user_id is admins.id (admin or doctor), 'member' = user_id is members.id
  await k.schema.alterTable('notifications', (t) => { t.string('audience', 10).notNullable().defaultTo('staff'); t.index(['audience', 'user_id', 'is_read']); });
};
exports.down = async (k) => {
  await k.schema.alterTable('notifications', (t) => { t.dropIndex(['audience', 'user_id', 'is_read']); t.dropColumn('audience'); });
  await k.schema.alterTable('career_applications', (t) => { t.dropIndex(['member_id']); t.dropColumn('member_id'); t.dropColumn('status_note'); });
  await k.schema.alterTable('appointments', (t) => { t.dropIndex(['member_id']); t.dropIndex(['assigned_to']); t.dropColumn('member_id'); t.dropColumn('assigned_to'); t.dropColumn('assigned_at'); });
  await k.schema.dropTableIfExists('members');
  await k.schema.alterTable('admins', (t) => { t.dropIndex(['team_id']); t.dropColumn('team_id'); t.dropColumn('is_active'); t.dropColumn('phone'); });
};
