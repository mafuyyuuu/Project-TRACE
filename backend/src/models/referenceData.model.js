const { pool } = require('../config/db');

/**
 * Raw SQL for the admin-managed reference tables (`colleges`,
 * `document_types`). These replace values that used to be hardcoded in the
 * frontend, so the Maintenance module can edit them without a deploy.
 */

// ---------------------------------------------------------------------------
// Colleges
// ---------------------------------------------------------------------------

function listColleges({ includeInactive = false } = {}, executor = pool) {
  const where = includeInactive ? '' : ' WHERE is_active = TRUE';
  return executor
    .query(`SELECT id, name, short_code, is_active FROM colleges${where} ORDER BY sort_order, name`)
    .then(([rows]) => rows);
}

function findCollegeByName(name, executor = pool) {
  return executor
    .query('SELECT id, name, short_code, is_active FROM colleges WHERE name = ?', [name])
    .then(([rows]) => rows);
}

// ---------------------------------------------------------------------------
// Document types
// ---------------------------------------------------------------------------

function listDocumentTypes({ includeInactive = false } = {}, executor = pool) {
  const where = includeInactive ? '' : ' WHERE is_active = TRUE';
  return executor
    .query(
      `SELECT id, name, base_fee, fee_rule, requires_attachment,
              attachment_label, attachment_helper, is_active, sort_order
       FROM document_types${where} ORDER BY sort_order, name`
    )
    .then(([rows]) => rows);
}

function findDocumentTypeByName(name, executor = pool) {
  return executor
    .query(
      `SELECT id, name, base_fee, fee_rule, requires_attachment,
              attachment_label, attachment_helper, is_active
       FROM document_types WHERE name = ?`,
      [name]
    )
    .then(([rows]) => rows);
}

/** Fetch several types at once, for pricing a multi-document request. */
function findDocumentTypesByNames(names, executor = pool) {
  if (!names.length) return Promise.resolve([]);
  const placeholders = names.map(() => '?').join(', ');
  return executor
    .query(
      `SELECT id, name, base_fee, fee_rule, requires_attachment, is_active
       FROM document_types WHERE name IN (${placeholders})`,
      names
    )
    .then(([rows]) => rows);
}

// ---------------------------------------------------------------------------
// Maintenance writes
//
// Deletion is always a deactivation: existing documents reference document
// types by name and users reference colleges by name, so removing a row would
// orphan historical records in a system of record.
// ---------------------------------------------------------------------------

function createCollege({ name, short_code, sort_order = 0 }, executor = pool) {
  return executor.query(
    'INSERT INTO colleges (name, short_code, sort_order) VALUES (?, ?, ?)',
    [name, short_code || null, sort_order]
  );
}

function updateCollege(id, { name, short_code, sort_order }, executor = pool) {
  return executor.query(
    `UPDATE colleges SET name = COALESCE(?, name), short_code = COALESCE(?, short_code),
            sort_order = COALESCE(?, sort_order) WHERE id = ?`,
    [name ?? null, short_code ?? null, sort_order ?? null, id]
  );
}

function setCollegeActive(id, isActive, executor = pool) {
  return executor.query('UPDATE colleges SET is_active = ? WHERE id = ?', [isActive, id]);
}

function findCollegeById(id, executor = pool) {
  return executor.query('SELECT * FROM colleges WHERE id = ?', [id]).then(([rows]) => rows);
}

function createDocumentType(data, executor = pool) {
  const {
    name, base_fee = 50.0, fee_rule = 'flat', requires_attachment = false,
    attachment_label = null, attachment_helper = null, sort_order = 0,
  } = data;
  return executor.query(
    `INSERT INTO document_types
       (name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order]
  );
}

function updateDocumentType(id, data, executor = pool) {
  const {
    name, base_fee, fee_rule, requires_attachment,
    attachment_label, attachment_helper, sort_order,
  } = data;
  return executor.query(
    `UPDATE document_types SET
       name = COALESCE(?, name),
       base_fee = COALESCE(?, base_fee),
       fee_rule = COALESCE(?, fee_rule),
       requires_attachment = COALESCE(?, requires_attachment),
       attachment_label = COALESCE(?, attachment_label),
       attachment_helper = COALESCE(?, attachment_helper),
       sort_order = COALESCE(?, sort_order)
     WHERE id = ?`,
    [name ?? null, base_fee ?? null, fee_rule ?? null,
     requires_attachment ?? null, attachment_label ?? null,
     attachment_helper ?? null, sort_order ?? null, id]
  );
}

function setDocumentTypeActive(id, isActive, executor = pool) {
  return executor.query('UPDATE document_types SET is_active = ? WHERE id = ?', [isActive, id]);
}

function findDocumentTypeById(id, executor = pool) {
  return executor.query('SELECT * FROM document_types WHERE id = ?', [id]).then(([rows]) => rows);
}

/** How many documents already reference this type — shown before deactivating. */
function countDocumentsUsingType(name, executor = pool) {
  return executor
    .query('SELECT COUNT(*) AS n FROM documents WHERE document_type = ?', [name])
    .then(([rows]) => rows[0].n);
}

/** How many users are assigned to this college. */
function countUsersInCollege(name, executor = pool) {
  return executor
    .query('SELECT COUNT(*) AS n FROM users WHERE course = ?', [name])
    .then(([rows]) => rows[0].n);
}

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

function listPaymentMethods({ includeInactive = false } = {}, executor = pool) {
  const where = includeInactive ? '' : ' WHERE is_active = TRUE';
  return executor
    .query(
      `SELECT id, code, name, provider, instructions, requires_reference,
              reference_label, requires_proof, is_active, sort_order
       FROM payment_methods${where} ORDER BY sort_order, name`
    )
    .then(([rows]) => rows);
}

function findPaymentMethodByCode(code, executor = pool) {
  return executor
    .query('SELECT * FROM payment_methods WHERE code = ?', [code])
    .then(([rows]) => rows);
}

function setPaymentMethodActive(id, isActive, executor = pool) {
  return executor.query('UPDATE payment_methods SET is_active = ? WHERE id = ?', [isActive, id]);
}

module.exports = {
  listPaymentMethods,
  findPaymentMethodByCode,
  setPaymentMethodActive,
  createCollege,
  updateCollege,
  setCollegeActive,
  findCollegeById,
  createDocumentType,
  updateDocumentType,
  setDocumentTypeActive,
  findDocumentTypeById,
  countDocumentsUsingType,
  countUsersInCollege,
  listColleges,
  findCollegeByName,
  listDocumentTypes,
  findDocumentTypeByName,
  findDocumentTypesByNames,
};
