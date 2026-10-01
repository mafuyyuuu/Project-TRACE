const { pool } = require('../src/config/db');
const statements = [
  `CREATE TABLE IF NOT EXISTS authenticator_credentials (
    user_id INT PRIMARY KEY,
    active_secret TEXT NULL,
    pending_secret TEXT NULL,
    pending_expires_ms BIGINT NULL,
    pending_version INT NULL,
    last_counter BIGINT NOT NULL DEFAULT -1,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until_ms BIGINT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS authenticator_recovery_codes (
    code_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    used_at TIMESTAMP NULL,
    INDEX authenticator_recovery_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS authenticator_challenges (
    nonce_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    token_version INT NOT NULL,
    method VARCHAR(20) NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX authenticator_challenge_user (user_id, expires_at_ms),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];
async function migrate(executor = pool) {
  for (const statement of statements) await executor.query(statement);
}
if (require.main === module) {
  migrate().then(() => console.log('Authenticator migration complete.')).catch(() => {
    console.error('Authenticator migration failed. Check database permissions and users schema.');
    process.exitCode = 1;
  }).finally(() => pool.end());
}
module.exports = { migrate, statements };
