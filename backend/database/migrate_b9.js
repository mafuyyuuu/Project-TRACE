const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trace_db',
  });

  console.log('Running Batch 9 DB migrations...');

  try {
    // 1. Add is_same_day column
    try {
      await connection.query('ALTER TABLE document_types ADD COLUMN is_same_day BOOLEAN NOT NULL DEFAULT FALSE');
      console.log('✓ Added is_same_day to document_types');
    } catch(err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log('✓ is_same_day already exists');
      else throw err;
    }

    // 2. Deactivate Good Moral
    await connection.query(`UPDATE document_types SET is_active = FALSE WHERE name = 'Certificate of Good Moral Character'`);
    console.log('✓ Deactivated Good Moral Character');

    // 3. Update attachments
    await connection.query(`UPDATE document_types SET requires_attachment = TRUE, attachment_label = 'Exit Clearance', attachment_helper = 'your Exit Clearance' WHERE name = 'Certificate of Transcript'`);
    await connection.query(`UPDATE document_types SET requires_attachment = TRUE, attachment_label = 'Affidavit of Loss / Sworn Statement', attachment_helper = 'your Affidavit or Statement' WHERE name = 'Honorable Dismissal'`);
    console.log('✓ Updated attachment labels');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}
runMigration();
