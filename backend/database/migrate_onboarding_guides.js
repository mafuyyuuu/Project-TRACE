const { pool } = require('../src/config/db');
const table = `CREATE TABLE IF NOT EXISTS onboarding_guides (
  user_id INT PRIMARY KEY,
  shown_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`;
async function migrate(executor = pool) { await executor.query(table); }
if (require.main === module) migrate().then(() => console.log('Onboarding guide migration complete. Existing accounts are not automatically enrolled.')).catch(() => {
  console.error('Onboarding guide migration failed.'); process.exitCode = 1;
}).finally(() => pool.end());
module.exports = { migrate, table };
