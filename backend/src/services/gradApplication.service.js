const { yearError } = require('../utils/profileYears');
const { PHONE_REQUIREMENTS, normalizePhoneNumber } = require('../utils/phoneNumber');
const { pool } = require('../config/db');
const gradModel = require('../models/gradApplication.model');
const userModel = require('../models/user.model');
const referenceModel = require('../models/referenceData.model');
const programService = require('./program.service');
const { badRequest, forbidden, notFound } = require('../utils/AppError');

/**
 * Graduate Application module.
 *
 * The Registrar hasn't finalised the field list, so nothing about the form is
 * fixed except the catalog-backed college/program pair: the fields live in
 * `grad_form_fields` and validation is derived
 * from those rows. Adding, removing or reordering a question is a data change,
 * not a code change. The known college year_graduated field additionally uses
 * the shared institutional year policy; other numeric fields stay configurable.
 */

/** Field types whose values must parse as something specific. */
const TYPE_VALIDATORS = {
  number: (v) => (/^-?\d{1,16}(?:\.\d{1,6})?$/.test(String(v)) && Number.isFinite(Number(v))
    && Math.abs(Number(v)) <= Number.MAX_SAFE_INTEGER ? null : 'must be a finite ordinary decimal with at most six decimal places'),
  tel: (v) => (normalizePhoneNumber(v) ? null : PHONE_REQUIREMENTS),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'must be a valid email address'),
  date: (v) => (Number.isNaN(Date.parse(v)) ? 'must be a valid date' : null),
};

/** Keep configurable questions, with the published degree tied to the catalog. */
function academicFields(fields) {
  const program = fields.find(field => field.field_key === 'program');
  if (!program) return fields;
  const existing = fields.find(field => field.field_key === 'college');
  const college = { ...existing, field_key: 'college', label: existing?.label || 'College',
    field_type: 'select', catalog: 'colleges', options: null, is_required: program.is_required || existing?.is_required || 0 };
  return fields.filter(field => field.field_key !== 'college').flatMap(field => field.field_key === 'program'
    ? [college, { ...field, field_type: 'select', catalog: 'programs', options: null }] : [field]);
}

async function academicAnswers(fields, answers, executor, lock = false) {
  if (!fields.some(field => field.catalog === 'programs') || (!answers.college && !answers.program)) return {};
  const colleges = await referenceModel.findCollegeByName(answers.college, executor);
  if (!colleges[0]) throw badRequest('Choose an active college.');
  const selected = await programService.profileFields({ role: 'student', college_id: null, program: null },
    { college_id: colleges[0].id, program: answers.program }, executor, lock);
  return { college: selected.course, program: selected.program };
}

/** The form definition the UI renders from. */
async function getFormFields() {
  return { fields: academicFields(await gradModel.listFields()) };
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
    if (field.field_key === 'year_graduated') {
      const problem = yearError(raw, { label: field.label, minimum: 2002, required: Boolean(field.is_required) });
      if (problem) errors.push(problem);
      continue;
    }
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const isEmpty = value === undefined || value === null || value === '';

    if (field.is_required && isEmpty) {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (isEmpty) continue;
    const limit = field.catalog ? 150 : field.field_type === 'textarea' ? 2000 : field.field_type === 'tel' ? 13 : 255;
    if ((typeof raw === 'string' && raw.length > limit)
      || (typeof raw !== 'string' && !(field.field_type === 'number' && typeof raw === 'number'))) {
      errors.push(`${field.label} must be at most ${limit} characters and use the requested format.`);
      continue;
    }

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

  const fields = academicFields(await gradModel.listFields());
  if (fields.length === 0) {
    throw badRequest('The graduate application form has not been configured yet.');
  }

  const errors = validateAnswers(fields, answers);
  if (errors.length) {
    throw badRequest(errors.join(' '));
  }

  await academicAnswers(fields, answers);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const savedAnswers = { ...answers, ...await academicAnswers(fields, answers, connection, true) };

    const [result] = await gradModel.insertApplication({ student_id: studentId }, connection);
    const applicationId = result.insertId;

    for (const field of fields) {
      const raw = savedAnswers[field.field_key];
      const value = field.field_type === 'tel' && raw ? normalizePhoneNumber(raw) : raw;
      if (value === undefined || value === null || value === '') continue;
      await gradModel.insertValue(
        { application_id: applicationId, field_key: field.field_key, value: String(value) },
        connection
      );
    }

    // Graduate access is derived from the committed application. Personal and
    // educational profile completion remains independent of this submission.
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

  // Owner, Admin or current-college Secretary only.
  if (user.role === 'student') {
    const owner = await userModel.findStudentIdById(user.id);
    if (!owner[0] || owner[0].student_id !== application.student_id) {
      throw forbidden('You can only view your own application.');
    }
  }

  if (user.role !== 'student') await assertReviewer(user, application);

  const [definitions, values] = await Promise.all([
    gradModel.listFields({ includeInactive: true }),
    gradModel.findValues(applicationId),
  ]);

  const fields = academicFields(definitions);
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

async function assertReviewer(user, application, executor = pool) {
  if (user.role === 'admin') return;
  if (user.role !== 'clerk' || user.desk_assignment !== 'Secretary') throw forbidden('Only Admin and the assigned college Secretary can review applications.');
  if (application) await require('./requestAssignment.service').assertSecretaryScope(user, application, executor);
}

async function listApplications(user, query = {}) {
  await assertReviewer(user);
  let scope;
  if (user.role !== 'admin') {
    const [account] = await userModel.findCourseById(user.id);
    if (!account?.college_id && !account?.course) throw forbidden('A college assignment is required.');
    scope = account;
  }
  return { applications: await gradModel.listApplications({ status: query.status, scope }) };
}

async function reviewApplication(user, applicationId, { status, notes }) {
  await assertReviewer(user);
  if (!['under_review', 'approved', 'rejected'].includes(status)) throw badRequest('Invalid status.');
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 2000)) throw badRequest('Notes must be at most 2000 characters.');
  const tx = await pool.getConnection();
  try {
    await tx.beginTransaction();
    const [application] = await gradModel.findApplicationById(applicationId, tx, true);
    if (!application) throw notFound('Application not found.');
    await assertReviewer(user, application, tx);
    await gradModel.updateApplicationStatus(applicationId, status, user.id, notes ?? null, tx);
    await tx.commit();
    return { message: `Application marked ${status}.` };
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.release(); }
}

module.exports = { getFormFields, validateAnswers, submitApplication, getApplication, listMyApplications, listApplications, reviewApplication };
