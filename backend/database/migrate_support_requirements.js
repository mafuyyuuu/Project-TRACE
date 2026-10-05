const { pool } = require('../src/config/db');
const statements = [
  `CREATE TABLE IF NOT EXISTS supporting_document_types (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS request_attachment_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, requirement_id INT NULL,
    document_id INT NULL, actor_id INT NULL, event_type VARCHAR(50) NOT NULL,
    snapshot JSON NOT NULL, created_at DATETIME(3) NOT NULL,
    FOREIGN KEY (requirement_id) REFERENCES request_attachment_requirements(id) ON DELETE SET NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id), INDEX (requirement_id,id)
  ) ENGINE=InnoDB`,
];
const columns = {
  catalog_id: 'INT NULL',
  identity_key: 'VARCHAR(100) NULL',
  replacement_of: 'INT NULL',
  superseded_at: 'TIMESTAMP NULL',
};
async function migrate(executor = pool) {
  for (const statement of statements) await executor.query(statement);
  const [existing] = await executor.query('SHOW COLUMNS FROM request_attachment_requirements');
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.some(column => column.Field === name)) await executor.query(`ALTER TABLE request_attachment_requirements ADD COLUMN ${name} ${definition}`);
  }
  const [constraints] = await executor.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='request_attachment_requirements' AND CONSTRAINT_NAME='attachment_catalog_fk'");
  if (!constraints.length) await executor.query('ALTER TABLE request_attachment_requirements ADD CONSTRAINT attachment_catalog_fk FOREIGN KEY(catalog_id) REFERENCES supporting_document_types(id)');
  await executor.query("ALTER TABLE request_attachment_requirements MODIFY status ENUM('requested','uploaded','accepted','rejected') NOT NULL DEFAULT 'requested'");
  // Old free-text labels are not trustworthy catalog identities. Preserve them
  // separately rather than merging different requirements with matching names.
  await executor.query("UPDATE request_attachment_requirements SET identity_key=CONCAT('legacy:',id) WHERE identity_key IS NULL");
  await executor.query(`INSERT INTO support_ticket_messages(ticket_id,kind,message,metadata,import_key,created_at)
    SELECT t.id,'requirement',CONCAT('Additional document: ',r.label),
      JSON_OBJECT('requirement_id',r.id,'document_id',r.document_id,'imported',TRUE),
      CONCAT('requirement:',t.id,':',r.id),UTC_TIMESTAMP(3)
    FROM request_attachment_requirements r JOIN support_tickets t ON t.document_id=r.document_id
    WHERE NOT EXISTS(SELECT 1 FROM support_ticket_messages m WHERE m.import_key=CONCAT('requirement:',t.id,':',r.id))`);
}
if (require.main === module) migrate().then(() => console.log('Supporting-document catalog migration complete. Enter approved types in Admin; legacy requirements are preserved.')).catch(error => { console.error('Supporting-document migration failed:', error.code || 'INTERNAL_ERROR'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, statements, columns };
