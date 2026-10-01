const { pool } = require('../src/config/db');
const table = `CREATE TABLE IF NOT EXISTS email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  kind ENUM('signup','change') NOT NULL, email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, token_version INT NOT NULL,
  expires_at DATETIME NOT NULL, used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX email_links_user (user_id, kind, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`;
async function migrate(executor = pool) {
  const [columns] = await executor.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['users', 'email_verified_at']);
  if (!columns.length) await executor.query('ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL');
  await executor.query(table);
}
if (require.main === module) migrate().then(() => console.log('Email verification migration complete. Existing accounts must verify their email.')).catch(() => { console.error('Email verification migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, table };
