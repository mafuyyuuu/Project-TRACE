const { pool } = require('../src/config/db');
async function migrate(executor = pool) {
  const [rows] = await executor.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['users', 'program']);
  if (!rows.length) await executor.query('ALTER TABLE users ADD COLUMN program VARCHAR(150) NULL');
}
if (require.main === module) migrate().then(() => console.log('Program migration complete. Existing program values remain unknown until entered.')).catch(() => { console.error('Program migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
