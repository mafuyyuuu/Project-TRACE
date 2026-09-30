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

const TYPE_COLLEGES = '(SELECT GROUP_CONCAT(college_id ORDER BY college_id) FROM document_type_colleges WHERE document_type_id = document_types.id) AS allowed_college_ids';
const shapeTypes = ([rows]) => rows.map(row => ({ ...row, allowed_college_ids: row.allowed_college_ids ? String(row.allowed_college_ids).split(',').map(Number) : [] }));

function listDocumentTypes({ includeInactive = false } = {}, executor = pool) {
  const where = includeInactive ? '' : ' WHERE is_active = TRUE';
  return executor
    .query(
      `SELECT id, name, base_fee, rental_fee, special_fee, fee_rule, requires_attachment,
              attachment_label, attachment_helper, is_active, sort_order, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule, is_same_day, ${TYPE_COLLEGES}
       FROM document_types${where} ORDER BY sort_order, name`
    )
    .then(shapeTypes);
}

function findDocumentTypeByName(name, executor = pool) {
  return executor
    .query(
      `SELECT id, name, base_fee, rental_fee, special_fee, fee_rule, requires_attachment,
              attachment_label, attachment_helper, is_active, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule, is_same_day, ${TYPE_COLLEGES}
       FROM document_types WHERE name = ?`,
      [name]
    )
    .then(shapeTypes);
}

/** Fetch several types at once, for pricing a multi-document request. */
function findDocumentTypesByNames(names, executor = pool, lock = false) {
  if (!names.length) return Promise.resolve([]);
  const placeholders = names.map(() => '?').join(', ');
  return executor
    .query(
      `SELECT document_types.*, ${TYPE_COLLEGES}
       FROM document_types WHERE name IN (${placeholders})${lock ? ' ORDER BY id FOR UPDATE' : ''}`,
      names
    )
    .then(shapeTypes);
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
    available_to = 'both', is_repeatable = true, is_walk_in = false,
    requires_original = false, registrar_attachment_rule = 'none', is_same_day = false, rental_fee = 0, special_fee = 0,
  } = data;
  return executor.query(
    `INSERT INTO document_types
       (name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order,
        available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule, is_same_day, rental_fee, special_fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order,
     available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule, is_same_day, rental_fee, special_fee]
  );
}

function updateDocumentType(id, data, executor = pool) {
  const {
    name, base_fee, fee_rule, requires_attachment,
    attachment_label, attachment_helper, sort_order,
    available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule, is_same_day, rental_fee, special_fee,
  } = data;
  return executor.query(
    `UPDATE document_types SET
       name = COALESCE(?, name),
       base_fee = COALESCE(?, base_fee),
       fee_rule = COALESCE(?, fee_rule),
       requires_attachment = COALESCE(?, requires_attachment),
       attachment_label = COALESCE(?, attachment_label),
       attachment_helper = COALESCE(?, attachment_helper),
       sort_order = COALESCE(?, sort_order),
       available_to = COALESCE(?, available_to), is_repeatable = COALESCE(?, is_repeatable),
       is_walk_in = COALESCE(?, is_walk_in), requires_original = COALESCE(?, requires_original),
       registrar_attachment_rule = COALESCE(?, registrar_attachment_rule), is_same_day = COALESCE(?, is_same_day),
       rental_fee = COALESCE(?, rental_fee), special_fee = COALESCE(?, special_fee)
     WHERE id = ?`,
    [name ?? null, base_fee ?? null, fee_rule ?? null,
     requires_attachment ?? null, attachment_label ?? null,
     attachment_helper ?? null, sort_order ?? null, available_to ?? null, is_repeatable ?? null,
     is_walk_in ?? null, requires_original ?? null, registrar_attachment_rule ?? null, is_same_day ?? null, rental_fee ?? null, special_fee ?? null, id]
  );
}

function setDocumentTypeActive(id, isActive, executor = pool) {
  return executor.query('UPDATE document_types SET is_active = ? WHERE id = ?', [isActive, id]);
}

function findDocumentTypeById(id, executor = pool) {
  return executor.query(`SELECT document_types.*, ${TYPE_COLLEGES} FROM document_types WHERE id = ?`, [id]).then(shapeTypes);
}

async function setDocumentTypeColleges(id, collegeIds, executor = pool) {
  await executor.query('DELETE FROM document_type_colleges WHERE document_type_id = ?', [id]);
  if (collegeIds.length) await executor.query(
    `INSERT INTO document_type_colleges (document_type_id, college_id) VALUES ${collegeIds.map(() => '(?, ?)').join(', ')}`,
    collegeIds.flatMap(collegeId => [id, collegeId])
  );
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

function findPaymentMethodById(id, executor = pool) {
  return executor.query('SELECT * FROM payment_methods WHERE id = ?', [id]).then(([rows]) => rows);
}

function createPaymentMethod(data, executor = pool) {
  const {
    code, name, provider = 'manual', instructions = null,
    requires_reference = true, reference_label = null,
    requires_proof = true, sort_order = 0,
  } = data;
  return executor.query(
    `INSERT INTO payment_methods
       (code, name, provider, instructions, requires_reference, reference_label, requires_proof, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, name, provider, instructions, requires_reference, reference_label, requires_proof, sort_order]
  );
}

/** `code` is deliberately not editable here — `documents.payment_method` stores it
 *  directly, so changing it would strand the lookup for historical rows. */
function updatePaymentMethod(id, data, executor = pool) {
  const {
    name, provider, instructions, requires_reference,
    reference_label, requires_proof, sort_order,
  } = data;
  return executor.query(
    `UPDATE payment_methods SET
       name = COALESCE(?, name),
       provider = COALESCE(?, provider),
       instructions = COALESCE(?, instructions),
       requires_reference = COALESCE(?, requires_reference),
       reference_label = COALESCE(?, reference_label),
       requires_proof = COALESCE(?, requires_proof),
       sort_order = COALESCE(?, sort_order)
     WHERE id = ?`,
    [name ?? null, provider ?? null, instructions ?? null,
     requires_reference ?? null, reference_label ?? null,
     requires_proof ?? null, sort_order ?? null, id]
  );
}

module.exports = {
  setDocumentTypeColleges,
  listPaymentMethods,
  findPaymentMethodByCode,
  findPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
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
