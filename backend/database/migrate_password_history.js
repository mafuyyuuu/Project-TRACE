/** Explicit upgrade for the base password-history table; never runs at startup. */
const { pool } = require('../src/config/db');

const statement = `CREATE TABLE IF NOT EXISTS password_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`;

async function migrate(executor = pool) {
  await executor.query(statement);
}

if (require.main === module) {
  migrate().then(() => console.log('Password history migration complete. Existing accounts and history preserved.'))
    .catch(() => {
      console.error('Password history migration failed. Check database permissions and users schema.');
      process.exitCode = 1;
    }).finally(() => pool.end());
}

module.exports = { migrate, statement };
