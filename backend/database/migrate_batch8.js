/** Run explicitly after reviewing the Batch 8 schema; never runs at API startup. */
const { pool } = require('../src/config/db');
async function migrate(executor = pool) {
  await executor.query(`CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await executor.query(`CREATE TABLE IF NOT EXISTS user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_hash CHAR(64) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_device (user_id, device_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  const authColumns = {
    failed_login_attempts: 'INT NOT NULL DEFAULT 0',
    locked_until: 'TIMESTAMP NULL DEFAULT NULL',
    token_version: 'INT NOT NULL DEFAULT 0',
    two_factor_enabled: 'BOOLEAN NOT NULL DEFAULT FALSE',
    pending_email: 'VARCHAR(255) NULL',
    email_otp: 'VARCHAR(10) NULL',
    email_otp_expires: 'TIMESTAMP NULL DEFAULT NULL',
    login_otp: 'VARCHAR(6) NULL',
    login_otp_expires: 'TIMESTAMP NULL DEFAULT NULL',
  };
  for (const [column, definition] of Object.entries(authColumns)) {
    try { await executor.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`); }
    catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') throw err; }
  }
  try {
    await executor.query('ALTER TABLE notifications ADD COLUMN action_url VARCHAR(255) NULL');
  } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') throw err; }
}
if (require.main === module) {
  migrate().then(() => console.log('Batch 8 migration complete.')).catch(err => {
    console.error(err.message); process.exitCode = 1;
  }).finally(() => pool.end());
}
module.exports = { migrate };
