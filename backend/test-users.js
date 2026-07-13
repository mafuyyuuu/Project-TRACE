const { pool } = require('./config/db');
async function run() {
  const [rows] = await pool.query('SELECT role, verification_status FROM users');
  console.log(rows);
  process.exit(0);
}
run();
