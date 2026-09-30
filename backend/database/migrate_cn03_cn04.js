/** CN-03/CN-04 only. Importing this module never runs a migration. */
const { pool } = require('../src/config/db');
const { RETIRED_DOCUMENT_NAMES } = require('../src/services/documentPolicy.service');
const MIGRATION_KEY = 'cn03_cn04_catalog_v1';

async function migrate(database = pool) {
  const connection = await database.getConnection();
  try {
    // DDL is outside the transaction because MySQL implicitly commits DDL.
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_key VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
    await connection.beginTransaction();
    // The unique key serializes concurrent runs. The marker rolls back with
    // the data changes if either UPDATE fails.
    const [marker] = await connection.query(
      'INSERT IGNORE INTO schema_migrations (migration_key) VALUES (?)', [MIGRATION_KEY]
    );
    if (!marker.affectedRows) {
      await connection.rollback();
      return { applied: false };
    }
    await connection.query(
      `UPDATE document_types SET is_active = FALSE
       WHERE LOWER(TRIM(name)) IN (${RETIRED_DOCUMENT_NAMES.map(() => '?').join(', ')})`,
      RETIRED_DOCUMENT_NAMES.map(name => name.toLowerCase())
    );
    // Change the old default, never other configured fees or request amounts.
    await connection.query(
      'UPDATE document_types SET base_fee = ? WHERE name = ? AND base_fee = ?',
      [250, 'Diploma', 50]
    );
    await connection.commit();
    return { applied: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  migrate().then(result => console.log(result.applied ? 'CN-03/CN-04 applied.' : 'CN-03/CN-04 already applied.'))
    .catch(err => { console.error('CN-03/CN-04 migration failed:', err.message); process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { migrate, MIGRATION_KEY };
