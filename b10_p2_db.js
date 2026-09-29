const { pool } = require('./backend/src/config/db');

async function runMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id INT PRIMARY KEY,
        extension_name VARCHAR(20),
        birth_date DATE,
        place_of_birth VARCHAR(255),
        sex ENUM('Male', 'Female'),
        civil_status ENUM('Single', 'Married', 'Widowed', 'Divorced', 'Separated'),
        maiden_name VARCHAR(255),
        home_address VARCHAR(500),
        last_attendance_year INT,
        is_transfer_student BOOLEAN DEFAULT FALSE,
        previous_school VARCHAR(255),
        elem_school VARCHAR(255),
        elem_grad_year INT,
        jhs_school VARCHAR(255),
        jhs_grad_year INT,
        shs_school VARCHAR(255),
        shs_grad_year INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created student_profiles table');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
runMigration();
