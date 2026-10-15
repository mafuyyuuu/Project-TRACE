const { pool } = require('../src/config/db');

const CREATE = `CREATE TABLE IF NOT EXISTS pickup_sms_reminders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  ready_step_id INT NOT NULL,
  period_no INT UNSIGNED NOT NULL,
  due_at_ms BIGINT NOT NULL,
  state ENUM('dispatching','accepted','failed','unknown','cancelled') NOT NULL,
  error_code VARCHAR(50) NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  UNIQUE KEY pickup_sms_once (document_id, ready_step_id, period_no),
  CONSTRAINT pickup_sms_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT pickup_sms_ready_step FOREIGN KEY (ready_step_id) REFERENCES step_logs(id) ON DELETE CASCADE
) ENGINE=InnoDB`;

async function migrate(executor = pool) {
  await executor.query(CREATE);
}

if (require.main === module) migrate()
  .then(() => console.log('Pickup SMS reminder ledger ready. Existing records preserved.'))
  .catch(error => { console.error('Pickup SMS migration failed:', error.code || 'INTERNAL_ERROR'); process.exitCode = 1; })
  .finally(() => pool.end());

module.exports = { migrate, CREATE };
