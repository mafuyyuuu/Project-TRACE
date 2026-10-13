const { pool } = require('../src/config/db');
const { REQUEST_CATALOG, includesDismissal } = require('../src/utils/requestCatalog');
const MIGRATION_KEY = 'registrar_request_catalog_2026_10_13';
const columns = [
  ['catalog_description', 'VARCHAR(500) NULL'],
  ['base_label', 'VARCHAR(100) NULL'],
  ['fee_pending', 'BOOLEAN NOT NULL DEFAULT FALSE'],
];
async function migrate(database = pool) {
  for (const [name, definition] of columns) {
    try { await database.query(`ALTER TABLE document_types ADD COLUMN ${name} ${definition}`); }
    catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') throw err; }
  }
  await database.query("ALTER TABLE document_types MODIFY fee_rule ENUM('flat','per_semester_block','per_page') NOT NULL DEFAULT 'flat'");
  await database.query("ALTER TABLE document_fee_schedules MODIFY fee_rule ENUM('flat','per_semester_block','per_page') NULL");
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [marker] = await connection.query('INSERT IGNORE INTO schema_migrations (migration_key) VALUES (?)', [MIGRATION_KEY]);
    if (!marker.affectedRows) { await connection.rollback(); return { applied: false }; }
    // This is the user's complete replacement list for new requests. Preserve
    // all old rows, saved request schedules, amounts, receipts and account data.
    await connection.query('SELECT id FROM document_types ORDER BY id FOR UPDATE');
    await connection.query('UPDATE document_types SET is_active = FALSE');
    for (const [index, type] of REQUEST_CATALOG.entries()) {
      await connection.query(`INSERT INTO document_types
        (name,base_fee,fee_rule,is_active,available_to,is_repeatable,is_walk_in,requires_original,is_same_day,sort_order,catalog_description,base_label,fee_pending)
        VALUES (?,?,?,TRUE,'both',?,FALSE,FALSE,FALSE,?,?,?,?)
        ON DUPLICATE KEY UPDATE base_fee=VALUES(base_fee),fee_rule=VALUES(fee_rule),is_active=TRUE,available_to='both',
        is_repeatable=VALUES(is_repeatable),is_walk_in=FALSE,is_same_day=FALSE,sort_order=VALUES(sort_order),
        catalog_description=VALUES(catalog_description),base_label=VALUES(base_label),fee_pending=VALUES(fee_pending),rental_fee=0,special_fee=0`,
      [type.name, type.base_fee, type.fee_rule, !includesDismissal(type.name), index, type.catalog_description || null, type.base_label || null, Boolean(type.fee_pending)]);
      const [[row]] = await connection.query('SELECT id FROM document_types WHERE name = ?', [type.name]);
      // Replace only this catalog's live fee settings. Historical snapshots are
      // untouched; later Admin edits survive the migration's ledger guard.
      await connection.query('DELETE FROM document_fee_schedules WHERE document_type_id = ?', [row.id]);
      await connection.query('DELETE FROM document_type_colleges WHERE document_type_id = ?', [row.id]);
      await connection.query('INSERT INTO document_fee_schedules (document_type_id,college_id,fee_items) VALUES (?,NULL,?)', [row.id, JSON.stringify(type.fee_items || [])]);
    }
    await connection.commit();
    return { applied: true, options: REQUEST_CATALOG.length };
  } catch (err) { await connection.rollback(); throw err; }
  finally { connection.release(); }
}
if (require.main === module) migrate().then(result => console.log(result.applied ? `Request catalog updated: ${result.options} options. Existing requests/receipts preserved.` : 'Request catalog already applied; current Admin edits preserved.'))
  .catch(err => { console.error('Request catalog migration failed:', err.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, MIGRATION_KEY, columns };
