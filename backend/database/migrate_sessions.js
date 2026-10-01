const { pool } = require('../src/config/db');
const statement = `CREATE TABLE IF NOT EXISTS session_revocations (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  INDEX session_revocation_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`;
async function migrate(executor = pool) { await executor.query(statement); }
if (require.main === module) migrate().then(() => console.log('Session migration complete.')).catch(() => { console.error('Session migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, statement };
