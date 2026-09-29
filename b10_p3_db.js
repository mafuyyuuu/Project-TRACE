const { pool } = require('./backend/src/config/db');

async function runMigration() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0');
    console.log('✓ Added failed_login_attempts');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err.message);
  }
  
  try {
    await pool.query('ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL');
    console.log('✓ Added locked_until');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created password_history table');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
runMigration();
