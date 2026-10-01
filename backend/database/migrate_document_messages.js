const { pool } = require('../src/config/db');
const table = `CREATE TABLE IF NOT EXISTS document_messages (
  id INT AUTO_INCREMENT PRIMARY KEY, document_id INT NOT NULL, sender_id INT NOT NULL,
  message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, read_at TIMESTAMP NULL,
  INDEX idx_document_messages_doc (document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`;
async function migrate(executor = pool) { await executor.query(table); }
if (require.main === module) migrate().then(() => console.log('Document messages migration complete. Existing conversations preserved.')).catch(() => {
  console.error('Document messages migration failed. Check users/documents table definitions and database permissions.'); process.exitCode = 1;
}).finally(() => pool.end());
module.exports = { migrate, table };
