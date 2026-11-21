// Clinic management (patients, consultations, treatments, visits, payments, expenses). Additive only: six new tables, nothing existing is changed.
// Doctors are team_members rows (the same ids appointments.assigned_to uses).
const money = (t, n) => t.decimal(n, 10, 2).notNullable().defaultTo(0);
exports.up = async (k) => {
  await k.schema.createTable('patients', (t) => {
    t.increments('id');
    t.string('file_no', 20).nullable().unique(); // RGX-00001, set right after insert
    t.string('name', 120).notNullable().index(); t.string('guardian_name', 120);
    t.string('gender', 10); t.date('dob').nullable(); t.integer('age').unsigned().nullable();
    t.string('phone', 30).index(); t.string('email', 190); t.string('city', 120); t.text('address');
    t.string('referred_by', 120); t.text('remarks');
    t.integer('member_id').unsigned().nullable().index(); // optional link to a website member account
    t.timestamps(true, true);
  });
  await k.schema.createTable('consultations', (t) => {
    t.increments('id');
    t.string('case_no', 20).nullable().unique();
    t.integer('patient_id').unsigned().notNullable().index(); t.integer('doctor_id').unsigned().nullable().index();
    t.date('visit_date').notNullable().index(); money(t, 'fee');
    t.string('referred_by', 120); t.string('height_cm', 10); t.string('weight_kg', 10);
    t.text('complaints'); t.text('allergies'); t.text('examination'); t.text('diagnosis'); t.text('investigation'); t.text('advice'); t.text('prescription');
    t.date('next_visit_date').nullable();
    t.string('status', 20).notNullable().defaultTo('pending').index(); // pending | completed | cancelled
    t.timestamps(true, true);
  });
  await k.schema.createTable('treatments', (t) => {
    t.increments('id');
    t.string('treatment_no', 20).nullable().unique();
    t.integer('patient_id').unsigned().notNullable().index(); t.integer('doctor_id').unsigned().nullable().index(); t.integer('consultation_id').unsigned().nullable();
    t.date('start_date').notNullable(); t.text('diagnosis'); t.text('details'); t.string('referred_by', 120); t.text('remarks');
    t.string('service_type', 10).notNullable().defaultTo('clinic'); // clinic | home
    t.string('package_type', 12).notNullable().defaultTo('regular'); // regular | package | procedure
    money(t, 'session_fee'); // regular / procedure: charged per visit
    t.integer('total_sessions').unsigned().nullable(); money(t, 'package_price'); // package: fixed price for a number of sessions
    t.date('next_visit_date').nullable();
    t.string('status', 20).notNullable().defaultTo('active').index(); // active | completed | cancelled
    t.timestamps(true, true);
  });
  await k.schema.createTable('treatment_visits', (t) => {
    t.increments('id');
    t.integer('treatment_id').unsigned().notNullable().index(); t.integer('doctor_id').unsigned().nullable().index();
    t.date('visit_date').notNullable().index(); money(t, 'amount'); t.text('notes');
    t.timestamps(true, true);
  });
  await k.schema.createTable('clinic_payments', (t) => {
    t.increments('id');
    t.string('receipt_no', 20).nullable().unique();
    t.integer('patient_id').unsigned().notNullable().index(); t.integer('consultation_id').unsigned().nullable().index(); t.integer('treatment_id').unsigned().nullable().index();
    money(t, 'amount'); money(t, 'discount');
    t.string('mode', 20).notNullable().defaultTo('cash'); // cash | upi | card | bank | other
    t.date('paid_on').notNullable().index(); t.string('note', 255); t.string('received_by', 120);
    t.timestamps(true, true);
  });
  await k.schema.createTable('expenses', (t) => {
    t.increments('id');
    t.date('spent_on').notNullable().index(); t.string('category', 80).notNullable(); t.string('title', 190).notNullable();
    money(t, 'amount'); t.string('mode', 20).notNullable().defaultTo('cash'); t.string('paid_to', 120); t.text('note');
    t.timestamps(true, true);
  });
};
exports.down = async (k) => {
  for (const t of ['expenses', 'clinic_payments', 'treatment_visits', 'treatments', 'consultations', 'patients']) await k.schema.dropTableIfExists(t);
};
