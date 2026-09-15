const { pool } = require('../config/db');
const gradModel = require('../models/gradApplication.model');
const userModel = require('../models/user.model');
const { badRequest, forbidden, notFound } = require('../utils/AppError');

/**
 * Graduate Application module.
 *
 * The Registrar hasn't finalised the field list, so nothing about the form is
 * hardcoded: the fields live in `grad_form_fields` and validation is *derived*
 * from those rows. Adding, removing or reordering a question is a data change,
 * not a code change.
 */

/** Field types whose values must parse as something specific. */
const TYPE_VALIDATORS = {
  number: (v) => (Number.isNaN(Number(v)) ? 'must be a number' : null),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'must be a valid email address'),
  date: (v) => (Number.isNaN(Date.parse(v)) ? 'must be a valid date' : null),
};

/** The form definition the UI renders from. */
async function getFormFields() {
  return { fields: await gradModel.listFields() };
}

/**
 * Check submitted answers against the active field definitions.
 *
 * Returns a list of human-readable problems rather than throwing, so the caller
 * can report every issue at once instead of one per round-trip.
 */
function validateAnswers(fields, answers) {
  const errors = [];
  const known = new Set(fields.map((f) => f.field_key));

  for (const field of fields) {
    const raw = answers[field.field_key];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const isEmpty = value === undefined || value === null || value === '';

    if (field.is_required && isEmpty) {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (isEmpty) continue;

    const check = TYPE_VALIDATORS[field.field_type];
    if (check) {
      const problem = check(value);
      if (problem) errors.push(`${field.label} ${problem}.`);
    }

    // A select may only contain one of its configured options.
    if (field.field_type === 'select' && field.options) {
      const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]');
      if (options.length && !options.includes(value)) {
        errors.push(`${field.label} must be one of: ${options.join(', ')}.`);
      }
    }
  }

  // Reject unknown keys rather than silently storing junk the form can't show.
  for (const key of Object.keys(answers)) {
    if (!known.has(key)) errors.push(`Unknown field: ${key}.`);
  }

  return errors;
}

/**
 * Submit an application on behalf of the authenticated student.
 *
 * As elsewhere in the system, the owning student is taken from the session, not
 * from the request body — a client cannot file an application for someone else.
 */
async function submitApplication(user, body) {
  const answers = body && body.answers ? body.answers : {};
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    throw badRequest('Answers must be an object keyed by field.');
  }

  const owner = await userModel.findStudentIdById(user.id);
  if (!owner[0]) {
    throw forbidden('Your account has no student record.');
  }
  const studentId = owner[0].student_id;

  const fields = await gradModel.listFields();
  if (fields.length === 0) {
    throw badRequest('The graduate application form has not been configured yet.');
  }

  const errors = validateAnswers(fields, answers);
  if (errors.length) {
    throw badRequest(errors.join(' '));
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await gradModel.insertApplication({ student_id: studentId }, connection);
    const applicationId = result.insertId;

    for (const field of fields) {
      const value = answers[field.field_key];
      if (value === undefined || value === null || value === '') continue;
      await gradModel.insertValue(
        { application_id: applicationId, field_key: field.field_key, value: String(value) },
        connection
      );
    }

    await connection.commit();
    return { message: 'Graduate application submitted successfully.', application_id: applicationId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** One application with its answers merged onto the field definitions. */
async function getApplication(user, applicationId) {
  const rows = await gradModel.findApplicationById(applicationId);
  if (rows.length === 0) {
    throw notFound('Application not found.');
  }
  const application = rows[0];

  // Students may only read their own; staff review anyone's.
  if (user.role === 'student') {
    const owner = await userModel.findStudentIdById(user.id);
    if (!owner[0] || owner[0].student_id !== application.student_id) {
      throw forbidden('You can only view your own application.');
    }
  }

  const [fields, values] = await Promise.all([
    gradModel.listFields({ includeInactive: true }),
    gradModel.findValues(applicationId),
  ]);

  const byKey = new Map(values.map((v) => [v.field_key, v.value]));
  return {
    application,
    answers: fields
      .map((f) => ({ field_key: f.field_key, label: f.label, field_type: f.field_type, value: byKey.get(f.field_key) ?? null }))
      // Keep answers to fields that have since been removed, so history stays readable.
      .concat(
        values
          .filter((v) => !fields.some((f) => f.field_key === v.field_key))
          .map((v) => ({ field_key: v.field_key, label: v.field_key, field_type: 'text', value: v.value }))
      ),
  };
}

/** A student's own submissions. */
async function listMyApplications(user) {
  const owner = await userModel.findStudentIdById(user.id);
  if (!owner[0]) {
    throw forbidden('Your account has no student record.');
  }
  return { applications: await gradModel.findApplicationsByStudent(owner[0].student_id) };
}

/** Staff review queue. */
async function listApplications(user, query = {}) {
  if (user.role !== 'admin' && user.role !== 'clerk') {
    throw forbidden('Access denied.');
  }
  return { applications: await gradModel.listApplications({ status: query.status }) };
}

/** Staff decision on an application. */
async function reviewApplication(user, applicationId, { status, notes }) {
  if (user.role !== 'admin' && user.role !== 'clerk') {
    throw forbidden('Access denied.');
  }
  if (!['under_review', 'approved', 'rejected'].includes(status)) {
    throw badRequest('Invalid status.');
  }

  const [result] = await gradModel.updateApplicationStatus(applicationId, status, user.id, notes ?? null);
  if (result.affectedRows === 0) {
    throw notFound('Application not found.');
  }

  return { message: `Application marked ${status}.` };
}

module.exports = {
  getFormFields,
  validateAnswers,
  submitApplication,
  getApplication,
  listMyApplications,
  listApplications,
  reviewApplication,
};
