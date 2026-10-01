const { pool } = require('../src/config/db');
async function migrate(executor = pool) {
  const [rows] = await executor.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['users', 'verification_reason']);
  if (!rows.length) await executor.query('ALTER TABLE users ADD COLUMN verification_reason VARCHAR(300) NULL');
}
if (require.main === module) migrate().then(() => console.log('Verification reason migration complete. Historical reasons remain unknown.')).catch(() => { console.error('Verification reason migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
