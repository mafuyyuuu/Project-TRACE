const fs = require('fs');
let schema = fs.readFileSync('backend/database/schema.sql', 'utf8');

schema = schema.replace(
  '  must_change_password BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  '  must_change_password BOOLEAN DEFAULT TRUE,\n  failed_login_attempts INT DEFAULT 0,\n  locked_until TIMESTAMP NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
);

const pwdHist = `
CREATE TABLE IF NOT EXISTS password_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

if (!schema.includes('password_history')) {
  schema = schema.replace(
    'CREATE TABLE IF NOT EXISTS documents (',
    pwdHist + '\nCREATE TABLE IF NOT EXISTS documents ('
  );
}

fs.writeFileSync('backend/database/schema.sql', schema);
