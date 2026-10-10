const { pool } = require('../src/config/db');

async function migrate(executor = pool) {
  const [columns] = await executor.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()');
  const found = new Set(columns.map(column => `${column.TABLE_NAME}.${column.COLUMN_NAME}`));
  for (const [table, column, definition] of [
    ['documents', 'routing_college_id', 'INT NULL'],
    ['documents', 'routing_college_name', 'VARCHAR(255) NULL'],
    ['request_attachment_requirements', 'blocks_intake', 'BOOLEAN NOT NULL DEFAULT FALSE'],
  ]) {
    if (!found.has(`${table}.${column}`)) await executor.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  // Historical requirements and college values are intentionally not rewritten.
}
if (require.main === module) migrate().then(() => console.log('Request intake scope migration complete. Historical values preserved.'))
  .catch(() => { console.error('Request intake scope migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
