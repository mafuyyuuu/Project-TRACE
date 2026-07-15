const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function run() {
  // Set password to "trace2024"
  const newHash = await bcrypt.hash('trace2024', 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE student_id = "23-00261"', [newHash]);
  
  // Test the login logic exactly as auth.js does it
  const [rows] = await pool.query('SELECT * FROM users WHERE student_id = ? AND is_active = TRUE', ['23-00261']);
  const user = rows[0];
  
  const isMatch = await bcrypt.compare('trace2024', user.password_hash);
  console.log("isMatch:", isMatch);
  process.exit(0);
}
run();
