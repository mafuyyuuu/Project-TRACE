/** Explicit upgrade only; importing this module never changes the database. */
const { pool } = require('../src/config/db');

async function migrate(executor = pool) {
  await executor.query(`CREATE TABLE IF NOT EXISTS trusted_browsers (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    token_version INT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX trusted_browsers_user_expiry (user_id, expires_at_ms),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
}

if (require.main === module) {
  migrate().then(() => console.log('Trusted browsers migration complete.')).catch(() => {
    console.error('Trusted browsers migration failed. Check database permissions and users schema.');
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { migrate };
