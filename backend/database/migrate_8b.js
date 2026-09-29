const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trace_db',
  });

  console.log('Connected to database. Running Batch 8b migrations...');

  const queries = [
    "ALTER TABLE document_types ADD COLUMN available_to ENUM('student', 'alumni', 'both') NOT NULL DEFAULT 'both'",
    "ALTER TABLE document_types ADD COLUMN is_repeatable BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE document_types ADD COLUMN is_walk_in BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE document_types ADD COLUMN requires_original BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE document_types ADD COLUMN registrar_attachment_rule ENUM('none', 'optional', 'required') NOT NULL DEFAULT 'none'",
    "ALTER TABLE users ADD COLUMN college_id INT NULL",
    "ALTER TABLE users ADD CONSTRAINT fk_user_college FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL",
    `CREATE TABLE IF NOT EXISTS document_type_colleges (
        document_type_id INT NOT NULL,
        college_id INT NOT NULL,
        PRIMARY KEY (document_type_id, college_id),
        FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )`
  ];

  for (const q of queries) {
    try {
      await connection.query(q);
      console.log('✓ Executed:', q.substring(0, 50) + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ Column already exists, skipping:', q.substring(0, 50) + '...');
      } else {
        console.error('Failed on query:', q);
        console.error(err.message);
      }
    }
  }

  await connection.end();
}

runMigration();
