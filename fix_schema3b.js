const fs = require('fs');
let schema = fs.readFileSync('backend/database/schema.sql', 'utf8');

schema = schema.replace(
  '  failed_login_attempts INT DEFAULT 0,\n  locked_until TIMESTAMP NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  '  failed_login_attempts INT DEFAULT 0,\n  locked_until TIMESTAMP NULL,\n  email_otp VARCHAR(10) NULL,\n  email_otp_expires TIMESTAMP NULL,\n  pending_email VARCHAR(255) NULL,\n  two_factor_secret VARCHAR(255) NULL,\n  two_factor_enabled BOOLEAN DEFAULT FALSE,\n  token_version INT DEFAULT 1,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
);

const secLogs = `
CREATE TABLE IF NOT EXISTS security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

if (!schema.includes('security_logs')) {
  schema = schema.replace(
    'CREATE TABLE IF NOT EXISTS documents (',
    secLogs + '\nCREATE TABLE IF NOT EXISTS documents ('
  );
}

fs.writeFileSync('backend/database/schema.sql', schema);
