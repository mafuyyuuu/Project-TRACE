const { pool } = require('../config/db');

/**
 * Raw SQL for the Graduate Application module.
 *
 * The form is admin-configurable: `grad_form_fields` holds the field
 * definitions, and each answer is its own row in `grad_application_values`, so
 * the Registrar adding a question never requires a migration.
 */

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

function listFields({ includeInactive = false } = {}, executor = pool) {
  const where = includeInactive ? '' : ' WHERE is_active = TRUE';
  return executor
    .query(
      `SELECT id, field_key, label, field_type, options, placeholder, help_text,
              is_required, is_active, sort_order
       FROM grad_form_fields${where} ORDER BY sort_order, id`
    )
    .then(([rows]) => rows);
}

function findFieldByKey(fieldKey, executor = pool) {
  return executor
    .query('SELECT * FROM grad_form_fields WHERE field_key = ?', [fieldKey])
    .then(([rows]) => rows);
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

function insertApplication({ student_id, status = 'submitted', notes = null }, executor = pool) {
  return executor.query(
    'INSERT INTO grad_applications (student_id, status, notes) VALUES (?, ?, ?)',
    [student_id, status, notes]
  );
}

function insertValue({ application_id, field_key, value }, executor = pool) {
  return executor.query(
    `INSERT INTO grad_application_values (application_id, field_key, value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [application_id, field_key, value]
  );
}

function findApplicationById(id, executor = pool) {
  return executor
    .query('SELECT * FROM grad_applications WHERE id = ?', [id])
    .then(([rows]) => rows);
}

function findApplicationsByStudent(studentId, executor = pool) {
  return executor
    .query('SELECT * FROM grad_applications WHERE student_id = ? ORDER BY submitted_at DESC', [studentId])
    .then(([rows]) => rows);
}

/** Answers for one application, keyed for easy merging with the definitions. */
function findValues(applicationId, executor = pool) {
  return executor
    .query('SELECT field_key, value FROM grad_application_values WHERE application_id = ?', [applicationId])
    .then(([rows]) => rows);
}

/** Staff review queue, newest first. */
function listApplications({ status } = {}, executor = pool) {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('ga.status = ?');
    params.push(status);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  return executor
    .query(
      `SELECT ga.*, u.full_name, u.email, u.course
       FROM grad_applications ga
       LEFT JOIN users u ON u.student_id = ga.student_id${where}
       ORDER BY ga.submitted_at DESC`,
      params
    )
    .then(([rows]) => rows);
}

function updateApplicationStatus(id, status, reviewedBy, notes, executor = pool) {
  return executor.query(
    'UPDATE grad_applications SET status = ?, reviewed_by = ?, notes = COALESCE(?, notes) WHERE id = ?',
    [status, reviewedBy, notes, id]
  );
}

module.exports = {
  listFields,
  findFieldByKey,
  insertApplication,
  insertValue,
  findApplicationById,
  findApplicationsByStudent,
  findValues,
  listApplications,
  updateApplicationStatus,
};
