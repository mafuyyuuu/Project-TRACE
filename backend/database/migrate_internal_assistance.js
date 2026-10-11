const { pool } = require('../src/config/db');
// Additive and rerunnable. Never imports student tickets, messages or files.
const statements = [
  `CREATE TABLE IF NOT EXISTS internal_assistance_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY, created_by INT NOT NULL,
    creator_desk VARCHAR(100) NOT NULL, subject VARCHAR(255) NOT NULL,
    category VARCHAR(40) NOT NULL, state ENUM('QUEUED','IN_PROGRESS','AWAITING_STAFF','RESOLVED') NOT NULL DEFAULT 'QUEUED',
    assigned_to INT NULL, version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    claimed_at DATETIME(3) NULL, resolved_at DATETIME(3) NULL,
    CONSTRAINT internal_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT internal_admin FOREIGN KEY (assigned_to) REFERENCES users(id),
    KEY internal_owner_cursor (created_by,id), KEY internal_queue_cursor (state,category,id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS internal_assistance_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, sender_id INT NULL,
    kind ENUM('message','system') NOT NULL DEFAULT 'message', message VARCHAR(2000) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    CONSTRAINT internal_message_ticket FOREIGN KEY (ticket_id) REFERENCES internal_assistance_tickets(id),
    CONSTRAINT internal_message_sender FOREIGN KEY (sender_id) REFERENCES users(id),
    KEY internal_history_cursor (ticket_id,id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS internal_assistance_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, actor_id INT NOT NULL,
    event_type VARCHAR(40) NOT NULL, client_key VARCHAR(64) NOT NULL, payload_hash CHAR(64) NOT NULL,
    message_id BIGINT NULL, data JSON NOT NULL, created_at DATETIME(3) NOT NULL,
    CONSTRAINT internal_event_ticket FOREIGN KEY (ticket_id) REFERENCES internal_assistance_tickets(id),
    CONSTRAINT internal_event_actor FOREIGN KEY (actor_id) REFERENCES users(id),
    UNIQUE KEY internal_actor_retry (actor_id,client_key), KEY internal_event_history (ticket_id,id)
  ) ENGINE=InnoDB`,
];
async function migrate(executor = pool) { for (const sql of statements) await executor.query(sql); }
if (require.main === module) migrate().then(() => console.log('Internal assistance schema ready. Existing support history preserved.'))
  .catch(() => { console.error('Internal assistance migration failed. Stop rollout and inspect schema.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, statements };
