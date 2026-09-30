/** Explicit upgrade; importing this module performs no writes. MySQL DDL is not transactional. */
const { pool } = require('../src/config/db');
const SCHEDULE_DDL = `CREATE TABLE IF NOT EXISTS document_fee_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_type_id INT NOT NULL,
  college_id INT NULL,
  college_key INT GENERATED ALWAYS AS (IFNULL(college_id, 0)) STORED,
  base_fee DECIMAL(10,2) NULL,
  fee_rule ENUM('flat', 'per_semester_block') NULL,
  rental_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  fee_items JSON NOT NULL,
  UNIQUE KEY fee_schedule_type_college (document_type_id, college_key),
  FOREIGN KEY (document_type_id) REFERENCES document_types(id),
  FOREIGN KEY (college_id) REFERENCES colleges(id)
) ENGINE=InnoDB`;
async function migrate(executor = pool) {
  for (const [table, column, definition] of [
    ['document_types', 'rental_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0'],
    ['document_types', 'special_fee', 'DECIMAL(10,2) NOT NULL DEFAULT 0'],
    ['documents', 'document_sequence_number', 'VARCHAR(255) NULL'],
    ['documents', 'pricing_snapshot', 'JSON NULL'], ['documents', 'fee_breakdown', 'JSON NULL'],
  ]) {
    const [rows] = await executor.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
    if (!rows.length) await executor.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  const [notes] = await executor.query(`SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'pricing_notes'`);
  if (notes.length && !['text', 'mediumtext', 'longtext'].includes(notes[0].DATA_TYPE)) await executor.query('ALTER TABLE documents MODIFY COLUMN pricing_notes TEXT NULL');
  await executor.query(SCHEDULE_DDL);
}
if (require.main === module) migrate().then(() => console.log('Fee schedules migration complete.'))
  .catch(() => { console.error('Fee schedules migration failed. Check schema and database permissions; retry the explicit migration.'); process.exitCode = 1; })
  .finally(() => pool.end());
module.exports = { migrate, SCHEDULE_DDL };
