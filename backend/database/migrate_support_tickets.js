const { pool } = require('../src/config/db');
const { DEFAULTS } = require('../src/utils/supportHours');
const statements = [
  `CREATE TABLE IF NOT EXISTS support_settings (
    id INT PRIMARY KEY, settings JSON NOT NULL, updated_by INT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), FOREIGN KEY (updated_by) REFERENCES users(id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS support_availability (
    user_id INT PRIMARY KEY, available BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY, student_user_id INT NOT NULL, document_id INT NULL,
    subject VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL DEFAULT 'general',
    state ENUM('FAQ_ASSISTANCE','QUEUED','IN_PROGRESS','AWAITING_STUDENT','RESOLVED') NOT NULL,
    assigned_to INT NULL, queued_at DATETIME(3) NULL, claimed_at DATETIME(3) NULL,
    reply_requested_at DATETIME(3) NULL, reply_clock JSON NULL, warned_at DATETIME(3) NULL,
    resolved_at DATETIME(3) NULL, imported BOOLEAN NOT NULL DEFAULT FALSE, import_key VARCHAR(100) NULL UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    open_general_owner INT GENERATED ALWAYS AS (CASE WHEN category <> 'linked' AND state <> 'RESOLVED' THEN student_user_id ELSE NULL END) STORED,
    live_clerk INT GENERATED ALWAYS AS (CASE WHEN state = 'IN_PROGRESS' THEN assigned_to ELSE NULL END) STORED,
    UNIQUE KEY support_one_open_general (open_general_owner), UNIQUE KEY support_one_live_clerk (live_clerk),
    INDEX support_owner_cursor(student_user_id,id), INDEX support_queue(state,queued_at,id), INDEX support_document(document_id),
    FOREIGN KEY (student_user_id) REFERENCES users(id), FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, sender_id INT NULL,
    kind ENUM('message','system','requirement') NOT NULL DEFAULT 'message', message VARCHAR(2000) NOT NULL,
    metadata JSON NULL, client_key VARCHAR(100) NULL, payload_hash CHAR(64) NULL, import_key VARCHAR(100) NULL UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY support_send_retry(sender_id,client_key), INDEX support_message_cursor(ticket_id,id),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id), FOREIGN KEY (sender_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS support_ticket_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, message_id BIGINT NOT NULL, filename VARCHAR(100) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL, size_bytes INT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES support_ticket_messages(id), INDEX(message_id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS support_ticket_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NULL, actor_id INT NULL, event_type VARCHAR(100) NOT NULL,
    event_key VARCHAR(100) NOT NULL UNIQUE, data JSON NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX support_event_timeline(ticket_id,id), INDEX support_event_period(created_at,event_type),
    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id), FOREIGN KEY(actor_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,
];
async function importHistory(executor) {
  const [invalid] = await executor.query(`SELECT
    (SELECT COUNT(*) FROM support_messages m LEFT JOIN users u ON u.id=m.student_user_id
      WHERE u.id IS NULL OR u.role<>'student') AS general_unmapped,
    (SELECT COUNT(*) FROM document_messages m LEFT JOIN documents d ON d.id=m.document_id
      LEFT JOIN (SELECT student_id,COUNT(*) AS owners FROM users WHERE role='student' GROUP BY student_id) u ON u.student_id=d.student_id
      WHERE d.id IS NULL OR COALESCE(u.owners,0)<>1) AS document_unmapped`);
  if (Number(invalid[0]?.general_unmapped) || Number(invalid[0]?.document_unmapped)) {
    const error = new Error('Legacy message ownership must be resolved before importing ticket history.');
    error.code = 'SUPPORT_HISTORY_OWNER_UNRESOLVED'; throw error;
  }
  await executor.query(`INSERT INTO support_tickets (student_user_id,subject,state,queued_at,created_at,updated_at,imported,import_key)
    SELECT student_user_id,'Imported general support','QUEUED',MIN(created_at),MIN(created_at),MAX(created_at),TRUE,CONCAT('general:',student_user_id)
    FROM support_messages GROUP BY student_user_id ON DUPLICATE KEY UPDATE import_key = support_tickets.import_key`);
  await executor.query(`INSERT INTO support_tickets (student_user_id,document_id,subject,category,state,queued_at,created_at,updated_at,imported,import_key)
    SELECT u.id,d.id,CONCAT('Request ',d.tracking_number),'linked','QUEUED',MIN(m.created_at),MIN(m.created_at),MAX(m.created_at),TRUE,CONCAT('document:',d.id)
    FROM document_messages m JOIN documents d ON d.id=m.document_id JOIN users u ON u.student_id=d.student_id AND u.role='student'
    GROUP BY u.id,d.id,d.tracking_number ON DUPLICATE KEY UPDATE import_key = support_tickets.import_key`);
  await executor.query(`INSERT INTO support_ticket_messages (ticket_id,sender_id,message,created_at,import_key)
    SELECT t.id,m.sender_id,m.message,m.created_at,CONCAT('general-message:',m.id)
    FROM support_messages m JOIN support_tickets t ON t.import_key=CONCAT('general:',m.student_user_id)
    ORDER BY m.created_at,m.id ON DUPLICATE KEY UPDATE import_key = support_ticket_messages.import_key`);
  await executor.query(`INSERT INTO support_ticket_messages (ticket_id,sender_id,message,created_at,import_key)
    SELECT t.id,m.sender_id,m.message,m.created_at,CONCAT('document-message:',m.id)
    FROM document_messages m JOIN support_tickets t ON t.import_key=CONCAT('document:',m.document_id)
    ORDER BY m.created_at,m.id ON DUPLICATE KEY UPDATE import_key = support_ticket_messages.import_key`);
  await executor.query(`INSERT INTO support_ticket_events (ticket_id,event_type,event_key,data,created_at)
    SELECT id,'imported',CONCAT('import:',id),JSON_OBJECT('state','QUEUED','source',import_key),created_at
    FROM support_tickets WHERE imported=TRUE ON DUPLICATE KEY UPDATE event_key = support_ticket_events.event_key`);
  const [missing] = await executor.query(`SELECT
    (SELECT COUNT(*) FROM support_messages m LEFT JOIN support_ticket_messages n ON n.import_key=CONCAT('general-message:',m.id)
      LEFT JOIN support_tickets t ON t.id=n.ticket_id WHERE n.id IS NULL OR t.student_user_id<>m.student_user_id) AS general_missing,
    (SELECT COUNT(*) FROM document_messages m LEFT JOIN support_ticket_messages n ON n.import_key=CONCAT('document-message:',m.id)
      LEFT JOIN support_tickets t ON t.id=n.ticket_id WHERE n.id IS NULL OR t.document_id<>m.document_id) AS document_missing`);
  if (Number(missing[0]?.general_missing) || Number(missing[0]?.document_missing)) {
    const error = new Error('Legacy history import did not preserve every message and owner.');
    error.code = 'SUPPORT_HISTORY_IMPORT_INCOMPLETE'; throw error;
  }
}
async function migrate(executor = pool) {
  for (const statement of statements) await executor.query(statement);
  await executor.query('INSERT INTO support_settings (id,settings) VALUES (1,?) ON DUPLICATE KEY UPDATE id=id', [JSON.stringify(DEFAULTS)]);
  // Schema DDL is intentionally separate: MySQL implicitly commits DDL.
  const connection = typeof executor.getConnection === 'function' ? await executor.getConnection() : executor;
  try {
    await connection.query("SET SESSION time_zone='+00:00'");
    await connection.beginTransaction();
    await importHistory(connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { if (connection !== executor) connection.release(); }
}
if (require.main === module) migrate().then(() => console.log('Support ticket history imported. Keep writers stopped until the matched API/frontend rollout is complete.')).catch(error => { console.error('Support ticket migration failed:', error.code || 'MIGRATION_ERROR'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, importHistory, statements };
