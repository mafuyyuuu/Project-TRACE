const { pool } = require('./config/db');
async function run() {
  const [rows] = await pool.query('SELECT * FROM users WHERE student_id = ? AND is_active = TRUE', ['23-00261']);
  console.log("Found rows:", rows.length);
  process.exit(0);
}
run();
