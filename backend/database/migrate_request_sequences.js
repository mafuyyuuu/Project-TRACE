const { pool } = require('../src/config/db');
const table = `CREATE TABLE IF NOT EXISTS document_request_counters (
  student_id VARCHAR(50) NOT NULL, document_type VARCHAR(255) NOT NULL,
  last_number INT UNSIGNED NOT NULL DEFAULT 0, original_issued BOOLEAN NOT NULL DEFAULT FALSE,
  original_recorded_by INT NULL, original_recorded_at DATETIME NULL, original_notes VARCHAR(2000) NULL,
  PRIMARY KEY (student_id, document_type)
) ENGINE=InnoDB`;
async function migrate(executor = pool) {
  await executor.query(table);
  await executor.query(`INSERT INTO document_request_counters (student_id, document_type, last_number)
    SELECT student_id, document_type, GREATEST(COUNT(*), COALESCE(MAX(CASE
      WHEN document_sequence_number REGEXP 'Request No[.] [0-9]+$'
      THEN CAST(SUBSTRING_INDEX(document_sequence_number, ' ', -1) AS UNSIGNED) ELSE 0 END), 0))
    FROM documents WHERE student_id IS NOT NULL AND document_type IS NOT NULL
    GROUP BY student_id, document_type
    ON DUPLICATE KEY UPDATE last_number = GREATEST(document_request_counters.last_number, VALUES(last_number))`);
}
if (require.main === module) migrate().then(() => console.log('Request counter migration complete. Historical labels and recorded originals remain unchanged.')).catch(() => { console.error('Request counter migration failed. Check the document sequence column and table definitions.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, table };
