const { pool } = require('../src/config/db');

async function migrate(executor = pool) {
  const [columns] = await executor.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()');
  const found = new Set(columns.map(column => `${column.TABLE_NAME}.${column.COLUMN_NAME}`));
  for (const [table, column, definition] of [
    ['student_profiles', 'year_started', 'INT NULL'],
    ['student_profiles', 'study_years_confirmed_at', 'DATETIME NULL'],
    ['users', 'registration_proof_unavailable', 'BOOLEAN NOT NULL DEFAULT FALSE'],
    ['users', 'registration_proof_reason', 'VARCHAR(500) NULL'],
  ]) {
    if (!found.has(`${table}.${column}`)) await executor.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  await executor.query(`CREATE TABLE IF NOT EXISTS study_year_events (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, actor_id INT NOT NULL,
    event_type ENUM('initial', 'correction') NOT NULL, previous_values JSON NOT NULL, saved_values JSON NOT NULL,
    reason VARCHAR(1000) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX study_year_events_user (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`);
  await executor.query(`CREATE TABLE IF NOT EXISTS account_review_events (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reviewer_id INT NOT NULL,
    decision ENUM('verified', 'rejected') NOT NULL, evidence_basis VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`);
}
if (require.main === module) migrate().then(() => console.log('Alumni study-year migration complete. Existing profile and request values were preserved.'))
  .catch(() => { console.error('Alumni study-year migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
