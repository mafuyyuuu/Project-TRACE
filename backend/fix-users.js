const { pool } = require('./config/db');
async function run() {
  await pool.query('UPDATE users SET verification_status = "verified" WHERE role != "student"');
  console.log("Updated staff accounts to verified!");
  process.exit(0);
}
run();
