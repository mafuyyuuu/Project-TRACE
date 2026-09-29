const { pool } = require('./backend/src/config/db');

async function runMigration() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN email_otp VARCHAR(10) NULL');
    await pool.query('ALTER TABLE users ADD COLUMN email_otp_expires TIMESTAMP NULL');
    await pool.query('ALTER TABLE users ADD COLUMN pending_email VARCHAR(255) NULL');
    await pool.query('ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL');
    await pool.query('ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE users ADD COLUMN token_version INT DEFAULT 1');
    console.log('✓ Added 3B columns to users');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created security_logs table');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
runMigration();
