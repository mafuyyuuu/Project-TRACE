const { pool } = require('../src/config/db');
const statements = [
  `CREATE TABLE IF NOT EXISTS request_attachment_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY, document_id INT NOT NULL, label VARCHAR(255) NOT NULL,
    instructions VARCHAR(2000) NOT NULL, status ENUM('requested','uploaded','accepted') NOT NULL DEFAULT 'requested',
    requested_by INT NOT NULL, reviewed_by INT NULL, review_notes VARCHAR(2000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id), FOREIGN KEY (reviewed_by) REFERENCES users(id), INDEX (document_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS request_attachment_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY, requirement_id INT NOT NULL, uploaded_by INT NOT NULL,
    file_path VARCHAR(500) NOT NULL, original_filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requirement_id) REFERENCES request_attachment_requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id), INDEX (requirement_id)
  ) ENGINE=InnoDB`,
];
async function migrate(executor = pool) { for (const statement of statements) await executor.query(statement); }
if (require.main === module) migrate().then(() => console.log('Request attachments migration complete.')).catch(() => { console.error('Request attachments migration failed.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, statements };
