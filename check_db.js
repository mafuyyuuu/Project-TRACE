const { pool } = require('./backend/src/config/db');
async function run() {
  const [rows] = await pool.query('DESCRIBE document_types');
  console.log(rows);
  process.exit(0);
}
run();
