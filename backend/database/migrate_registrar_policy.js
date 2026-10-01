const { pool } = require('../src/config/db');
const { sameDayWalkInTypes } = require('../src/services/documentPolicy.service');
async function migrate(executor = pool) {
  const [columns] = await executor.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['documents', 'is_same_day']);
  if (!columns.length) await executor.query('ALTER TABLE documents ADD COLUMN is_same_day BOOLEAN NOT NULL DEFAULT FALSE');
  // Reference policy only: never activate fee drafts, rewrite requests or reset quantities.
  await executor.query("UPDATE document_types SET is_repeatable = CASE WHEN LOWER(TRIM(name)) = 'honorable dismissal' THEN FALSE ELSE TRUE END");
  for (const name of sameDayWalkInTypes) await executor.query('UPDATE document_types SET is_walk_in = TRUE, is_same_day = TRUE, requires_original = TRUE WHERE name = ?', [name]);
}
if (require.main === module) migrate().then(() => console.log('Registrar policy migration complete.')).catch(() => { console.error('Registrar policy migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
