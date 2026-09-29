const fs = require('fs');
let schema = fs.readFileSync('backend/database/schema.sql', 'utf8');

if (!schema.includes('CREATE TABLE IF NOT EXISTS student_profiles')) {
  const profileTable = `
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
);
`;
  schema = schema.replace(
    'CREATE TABLE IF NOT EXISTS documents (',
    profileTable + '\nCREATE TABLE IF NOT EXISTS documents ('
  );
  fs.writeFileSync('backend/database/schema.sql', schema);
}
