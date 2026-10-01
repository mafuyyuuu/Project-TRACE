const { pool } = require('../src/config/db');
const statement = `CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY, student_user_id INT NOT NULL, sender_id INT NOT NULL,
  message VARCHAR(2000) NOT NULL, read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX support_conversation (student_user_id, id),
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB`;
async function migrate(executor = pool) { await executor.query(statement); }
if (require.main === module) migrate().then(() => console.log('General support migration complete.')).catch(() => { console.error('General support migration failed. Check users schema and database permissions.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, statement };
