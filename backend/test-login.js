const { pool } = require('./config/db');
async function run() {
  const [rows] = await pool.query('SELECT student_id, is_active, password_hash, verification_status FROM users WHERE role="student" ORDER BY id DESC LIMIT 1');
  console.log(rows);
  process.exit(0);
}
run();
