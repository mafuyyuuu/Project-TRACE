const { pool } = require('../src/config/db');
const SQL = `CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  hits INT UNSIGNED NOT NULL, reset_at_ms BIGINT UNSIGNED NOT NULL,
  INDEX rate_limit_expiry (reset_at_ms)
) ENGINE=InnoDB`;
async function migrate(executor = pool) { await executor.query(SQL); }
if (require.main === module) migrate().then(() => console.log('Rate-limit migration complete.'))
  .catch(() => { console.error('Rate-limit migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, SQL };
