/** Explicit Batch 8b migration. Importing this module never changes a database. */
const { pool } = require('../src/config/db');

async function migrate(executor = pool) {
  const columns = {
    available_to: "ENUM('student', 'alumni', 'both') NOT NULL DEFAULT 'both'",
    is_repeatable: 'BOOLEAN NOT NULL DEFAULT TRUE',
    is_walk_in: 'BOOLEAN NOT NULL DEFAULT FALSE',
    requires_original: 'BOOLEAN NOT NULL DEFAULT FALSE',
    registrar_attachment_rule: "ENUM('none', 'optional', 'required') NOT NULL DEFAULT 'none'",
    is_same_day: 'BOOLEAN NOT NULL DEFAULT FALSE',
  };
  for (const [name, definition] of Object.entries(columns)) {
    try { await executor.query(`ALTER TABLE document_types ADD COLUMN ${name} ${definition}`); }
    catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') throw err; }
  }
  try { await executor.query('ALTER TABLE users ADD COLUMN college_id INT NULL'); }
  catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') throw err; }
  await executor.query(`UPDATE users u JOIN colleges c ON BINARY u.course = BINARY c.name
    SET u.college_id = c.id WHERE u.college_id IS NULL`);
  const [keys] = await executor.query(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'college_id'
    AND REFERENCED_TABLE_NAME = 'colleges'`);
  if (!keys.length) await executor.query(`ALTER TABLE users ADD CONSTRAINT fk_user_college
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL`);
  await executor.query(`CREATE TABLE IF NOT EXISTS document_type_colleges (
    document_type_id INT NOT NULL, college_id INT NOT NULL,
    PRIMARY KEY (document_type_id, college_id),
    FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
  )`);
  await executor.query('UPDATE document_types SET is_repeatable = FALSE WHERE name = ?', ['Honorable Dismissal']);
  // Drafts never overwrite an existing type or become requestable automatically.
  for (const name of ['CTC', '2nd Copy of COR', '2nd Copy of OGR', 'CAV']) {
    await executor.query(`INSERT INTO document_types (name, base_fee, is_active, is_walk_in, requires_original)
      SELECT ?, 0, FALSE, TRUE, FALSE WHERE NOT EXISTS (SELECT 1 FROM document_types WHERE name = ?)`, [name, name]);
  }
}

if (require.main === module) {
  migrate().then(() => console.log('Batch 8b migration complete.')).catch(err => {
    console.error(err.message); process.exitCode = 1;
  }).finally(() => pool.end());
}
module.exports = { migrate };
