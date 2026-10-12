const { pool } = require('../src/config/db');
// Preserving, rerunnable DDL only. Historical documents/OR numbers are neither
// rewritten nor seeded. Activation checks the live historical serials as well.
const statements = [
 `CREATE TABLE IF NOT EXISTS finance_receipt_packs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, pattern JSON NOT NULL, start_serial VARCHAR(100) NOT NULL,
 consumed TINYINT UNSIGNED NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by INT NOT NULL, replacement_reason VARCHAR(2000) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TIMESTAMP NULL
 ) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS finance_receipt_control (
 id INT PRIMARY KEY, active_pack_id BIGINT NULL, print_config JSON NULL, version INT NOT NULL DEFAULT 0
 ) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS finance_issued_receipts (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, request_group_id VARCHAR(100) NOT NULL,
 active_group VARCHAR(100) NULL, document_id INT NOT NULL, pack_id BIGINT NOT NULL,
 serial VARCHAR(100) NOT NULL, client_key VARCHAR(64) NOT NULL, snapshot JSON NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'ISSUED', cashier_id INT NOT NULL, issue_date DATE NOT NULL,
 copy_path VARCHAR(255) NULL, void_reason VARCHAR(2000) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY receipt_serial (serial), UNIQUE KEY receipt_retry_key (client_key),
 UNIQUE KEY receipt_active_group (active_group), KEY receipt_group_history (request_group_id,id)
 ) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS finance_receipt_serials (
 serial VARCHAR(100) PRIMARY KEY, pack_id BIGINT NOT NULL, position TINYINT UNSIGNED NOT NULL,
 receipt_id BIGINT NULL, state VARCHAR(16) NOT NULL DEFAULT 'RESERVED',
 UNIQUE KEY pack_position (pack_id,position)
 ) ENGINE=InnoDB`,
 `CREATE TABLE IF NOT EXISTS finance_receipt_events (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, pack_id BIGINT NULL, receipt_id BIGINT NULL,
 actor_id INT NOT NULL, event_type VARCHAR(40) NOT NULL, data JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY receipt_event_history (receipt_id,id)
 ) ENGINE=InnoDB`,
 `INSERT IGNORE INTO finance_receipt_control (id) VALUES (1)`,
];
async function migrate(executor = pool) {
 for (const sql of statements) await executor.query(sql);
 const [indexes] = await executor.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documents' AND COLUMN_NAME='or_number' AND SEQ_IN_INDEX=1 AND SUB_PART IS NULL");
 if (!indexes.length) await executor.query('ALTER TABLE documents ADD INDEX idx_documents_or_number (or_number)');
}
if (require.main === module) migrate().then(() => console.log('Receipt-pack schema ready. Historical ORs preserved; no pack was activated.'))
 .catch(() => { console.error('Receipt-pack migration failed. Stop rollout and inspect schema.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, statements };
