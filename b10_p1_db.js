const { pool } = require('./backend/src/config/db');

async function runMigration() {
  try {
    await pool.query('ALTER TABLE document_types ADD COLUMN rental_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    console.log('✓ Added rental_fee');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
  }

  try {
    await pool.query('ALTER TABLE document_types ADD COLUMN special_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    console.log('✓ Added special_fee');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
  }

  try {
    await pool.query('ALTER TABLE documents ADD COLUMN or_uploaded_at TIMESTAMP NULL DEFAULT NULL');
    console.log('✓ Added or_uploaded_at');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
  }
  
  process.exit(0);
}
runMigration();
