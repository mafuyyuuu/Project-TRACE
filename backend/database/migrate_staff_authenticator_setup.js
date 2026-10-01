const { pool } = require('../src/config/db');
const table = `CREATE TABLE IF NOT EXISTS staff_authenticator_setup (
  user_id INT PRIMARY KEY, code_hash CHAR(64) NOT NULL, issued_by INT NOT NULL,
  token_version INT NOT NULL, expires_at_ms BIGINT NOT NULL,
  attempts INT NOT NULL DEFAULT 0, consumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id)
) ENGINE=InnoDB`;
async function migrate(executor = pool) { await executor.query(table); }
if (require.main === module) migrate().then(() => console.log('Staff authenticator setup migration complete.'))
  .catch(() => { console.error('Staff setup migration failed. Check database permissions and users schema.'); process.exitCode = 1; })
  .finally(() => pool.end());
module.exports = { migrate, table };
