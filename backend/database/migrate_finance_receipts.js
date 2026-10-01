const { pool } = require('../src/config/db');
const columns = { payment_cleared_at: 'TIMESTAMP NULL', or_earliest_issue_date: 'DATE NULL', or_uploaded_at: 'TIMESTAMP NULL' };
async function migrate(executor = pool) {
  for (const [name, type] of Object.entries(columns)) {
    const [rows] = await executor.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['documents', name]);
    if (!rows.length) await executor.query(`ALTER TABLE documents ADD COLUMN ${name} ${type}`);
  }
}
if (require.main === module) migrate().then(() => console.log('Finance receipt migration complete.')).catch(() => { console.error('Finance receipt migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, columns };
