/** Explicit, additive upgrade. Existing years and request records are preserved. */
const { pool } = require('../src/config/db');

async function migrate(executor = pool) {
  const [columns] = await executor.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'");
  const found = new Set(columns.map(column => column.COLUMN_NAME));
  for (const column of ['year_level', 'section']) {
    if (!found.has(column)) await executor.query(`ALTER TABLE student_profiles ADD COLUMN ${column} VARCHAR(20) NULL`);
  }
}

if (require.main === module) migrate().then(() => console.log('Current-student details migration complete.'))
  .catch(() => { console.error('Current-student details migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
