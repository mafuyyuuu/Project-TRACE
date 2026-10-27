const { pool } = require('../src/config/db');
const statements = [`CREATE TABLE IF NOT EXISTS conversation_reads (
  user_id INT NOT NULL,
  channel ENUM('support','staff','internal') NOT NULL,
  conversation_id INT NOT NULL,
  last_message_id BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id,channel,conversation_id),
  CONSTRAINT conversation_read_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`];
async function migrate(executor = pool) { for (const sql of statements) await executor.query(sql); }
if (require.main === module) migrate().then(() => console.log('Conversation read positions ready. Messages preserved.'))
  .catch(() => { console.error('Conversation read migration failed. Stop rollout and inspect schema.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate,statements };
