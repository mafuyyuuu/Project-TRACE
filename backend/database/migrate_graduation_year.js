/** Explicit preserving upgrade; attendance records are never reclassified. */
const { pool } = require('../src/config/db');
async function migrate(executor = pool) {
  const [rows] = await executor.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['student_profiles', 'graduation_year']);
  if (!rows.length) await executor.query('ALTER TABLE student_profiles ADD COLUMN graduation_year INT NULL');
}
if (require.main === module) migrate().then(() => console.log('Graduation year migration complete. Existing attendance values are unchanged; alumni must enter their confirmed college graduation year.')).catch(() => { console.error('Graduation year migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
