const { pool } = require('../src/config/db');
// Separate staff conversations; never imports student or internal-assistance history.
const statements = [
  `CREATE TABLE IF NOT EXISTS staff_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participant_low INT NOT NULL, participant_high INT NOT NULL,
    scope_college_id INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    CONSTRAINT staff_chat_low FOREIGN KEY (participant_low) REFERENCES users(id),
    CONSTRAINT staff_chat_high FOREIGN KEY (participant_high) REFERENCES users(id),
    UNIQUE KEY staff_chat_pair (participant_low,participant_high,scope_college_id),
    KEY staff_chat_low_cursor (participant_low,id), KEY staff_chat_high_cursor (participant_high,id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS staff_conversation_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, conversation_id INT NOT NULL,
    sender_id INT NOT NULL, message VARCHAR(2000) NOT NULL, created_at DATETIME(3) NOT NULL,
    CONSTRAINT staff_chat_message_thread FOREIGN KEY (conversation_id) REFERENCES staff_conversations(id),
    CONSTRAINT staff_chat_message_sender FOREIGN KEY (sender_id) REFERENCES users(id),
    KEY staff_chat_history (conversation_id,id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS staff_conversation_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, conversation_id INT NOT NULL, actor_id INT NOT NULL,
    event_type VARCHAR(20) NOT NULL, client_key VARCHAR(64) NOT NULL,
    payload_hash CHAR(64) NOT NULL, message_id BIGINT NOT NULL, created_at DATETIME(3) NOT NULL,
    CONSTRAINT staff_chat_event_thread FOREIGN KEY (conversation_id) REFERENCES staff_conversations(id),
    CONSTRAINT staff_chat_event_actor FOREIGN KEY (actor_id) REFERENCES users(id),
    UNIQUE KEY staff_chat_retry (actor_id,client_key), KEY staff_chat_events (conversation_id,id)
  ) ENGINE=InnoDB`,
];
async function migrate(executor = pool) { for (const sql of statements) await executor.query(sql); }
if (require.main === module) migrate().then(() => console.log('Staff conversation schema ready. Existing conversations preserved.'))
  .catch(() => { console.error('Staff conversation migration failed. Stop rollout and inspect schema.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate,statements };
