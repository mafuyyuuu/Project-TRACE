const { pool } = require('../src/config/db');
async function migrate(executor = pool) {
  await executor.query(`CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    college_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY programs_college_name (college_id, name),
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`);
  // Match colleges.name without truncating historical display names.
  const [rows] = await executor.query("SELECT CHARACTER_MAXIMUM_LENGTH AS capacity FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'course'");
  if (rows[0] && Number(rows[0].capacity) < 150) await executor.query('ALTER TABLE users MODIFY COLUMN course VARCHAR(150) NULL');
}
if (require.main === module) migrate().then(() => console.log('Program catalog migration complete. Admin must enter Registrar-approved programs; existing profiles are preserved.')).catch(() => { console.error('Program catalog migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
