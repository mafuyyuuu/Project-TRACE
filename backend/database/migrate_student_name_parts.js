const { pool } = require('../src/config/db');

/** Additive, rerunnable migration. Never guess or rewrite existing identities. */
async function migrate(executor = pool) {
  const [columns] = await executor.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'");
  if (!columns.length) throw new Error('Apply migrate_student_profiles.js before this migration.');
  const existing = new Set(columns.map(column => column.COLUMN_NAME));
  for (const field of ['first_name', 'middle_name', 'last_name']) {
    if (!existing.has(field)) await executor.query(`ALTER TABLE student_profiles ADD COLUMN ${field} VARCHAR(255) NULL`);
  }
}
if (require.main === module) migrate()
  .then(() => console.log('Student name fields ready. Existing full names and issued receipt snapshots were preserved.'))
  .catch(() => { console.error('Student name migration failed.'); process.exitCode = 1; })
  .finally(() => pool.end());
module.exports = { migrate };
