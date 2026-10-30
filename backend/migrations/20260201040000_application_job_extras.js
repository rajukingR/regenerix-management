// Additive only: new columns + indexes on existing tables. No data is dropped.
exports.up = async (k) => {
  await k.schema.alterTable('career_applications', (t) => { t.text('cover_letter'); t.string('resume_name', 190); t.index(['job_id']); t.index(['status']); });
  await k.schema.alterTable('jobs', (t) => { t.string('department', 120); t.string('employment_type', 60); });
};
exports.down = async (k) => {
  await k.schema.alterTable('career_applications', (t) => { t.dropIndex(['job_id']); t.dropIndex(['status']); t.dropColumn('cover_letter'); t.dropColumn('resume_name'); });
  await k.schema.alterTable('jobs', (t) => { t.dropColumn('department'); t.dropColumn('employment_type'); });
};
