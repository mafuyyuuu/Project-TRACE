const bcrypt = require('bcryptjs');
const referenceModel = require('../models/referenceData.model');
const userModel = require('../models/user.model');
const { badRequest, forbidden, notFound } = require('../utils/AppError');

/**
 * Admin maintenance: managing staff accounts, document types and colleges.
 *
 * Two rules run through this whole module:
 *  - **Deletion is deactivation.** Documents reference document types by name
 *    and users reference colleges by name, so removing a row would orphan
 *    historical records. `is_active` hides an entry from dropdowns while
 *    leaving history intact and reversible.
 *  - **Admin only.** Every entry point checks the role first.
 */

const VALID_DESKS = ['Finance', 'Window 1', 'Secretary', 'Admin Office', 'Receiving Desk', 'Records Desk'];
const VALID_ROLES = ['clerk', 'admin'];
const MIN_PASSWORD_LENGTH = 8;

function assertAdmin(user) {
  if (!user || user.role !== 'admin') {
    throw forbidden('Access denied. Admin role required.');
  }
}

// ---------------------------------------------------------------------------
// Colleges
// ---------------------------------------------------------------------------

async function listColleges(user) {
  assertAdmin(user);
  return { colleges: await referenceModel.listColleges({ includeInactive: true }) };
}

async function createCollege(user, { name, short_code, sort_order }) {
  assertAdmin(user);
  if (!name || !name.trim()) throw badRequest('College name is required.');

  const existing = await referenceModel.findCollegeByName(name.trim());
  if (existing.length) throw badRequest('A college with that name already exists.');

  const [result] = await referenceModel.createCollege({
    name: name.trim(), short_code, sort_order,
  });
  return { message: 'College created.', id: result.insertId };
}

async function updateCollege(user, id, data) {
  assertAdmin(user);
  const rows = await referenceModel.findCollegeById(id);
  if (!rows.length) throw notFound('College not found.');

  if (data.name !== undefined && !String(data.name).trim()) {
    throw badRequest('College name cannot be empty.');
  }

  await referenceModel.updateCollege(id, data);
  return { message: 'College updated.' };
}

/**
 * Deactivate (or restore) a college. Reports how many users are assigned to it
 * so the admin understands the impact before hiding it from signup.
 */
async function setCollegeActive(user, id, isActive) {
  assertAdmin(user);
  const rows = await referenceModel.findCollegeById(id);
  if (!rows.length) throw notFound('College not found.');

  await referenceModel.setCollegeActive(id, Boolean(isActive));
  const affectedUsers = await referenceModel.countUsersInCollege(rows[0].name);

  return {
    message: isActive ? 'College restored.' : 'College deactivated.',
    affected_users: affectedUsers,
  };
}

// ---------------------------------------------------------------------------
// Document types
// ---------------------------------------------------------------------------

async function listDocumentTypes(user) {
  assertAdmin(user);
  return { document_types: await referenceModel.listDocumentTypes({ includeInactive: true }) };
}

async function createDocumentType(user, data) {
  assertAdmin(user);
  if (!data.name || !data.name.trim()) throw badRequest('Document type name is required.');

  const fee = data.base_fee === undefined ? 50 : Number(data.base_fee);
  if (Number.isNaN(fee) || fee < 0) throw badRequest('Base fee must be a non-negative number.');
  if (data.fee_rule && !['flat', 'per_semester_block'].includes(data.fee_rule)) {
    throw badRequest("Fee rule must be 'flat' or 'per_semester_block'.");
  }

  const existing = await referenceModel.findDocumentTypeByName(data.name.trim());
  if (existing.length) throw badRequest('A document type with that name already exists.');

  const [result] = await referenceModel.createDocumentType({ ...data, name: data.name.trim(), base_fee: fee });
  return { message: 'Document type created.', id: result.insertId };
}

async function updateDocumentType(user, id, data) {
  assertAdmin(user);
  const rows = await referenceModel.findDocumentTypeById(id);
  if (!rows.length) throw notFound('Document type not found.');

  if (data.base_fee !== undefined) {
    const fee = Number(data.base_fee);
    if (Number.isNaN(fee) || fee < 0) throw badRequest('Base fee must be a non-negative number.');
  }
  if (data.fee_rule && !['flat', 'per_semester_block'].includes(data.fee_rule)) {
    throw badRequest("Fee rule must be 'flat' or 'per_semester_block'.");
  }

  // Renaming would strand every existing document that stores this name.
  if (data.name && data.name.trim() !== rows[0].name) {
    const inUse = await referenceModel.countDocumentsUsingType(rows[0].name);
    if (inUse > 0) {
      throw badRequest(
        `Cannot rename: ${inUse} existing document(s) reference "${rows[0].name}". Deactivate it and create a new type instead.`
      );
    }
  }

  await referenceModel.updateDocumentType(id, data);
  return { message: 'Document type updated.' };
}

async function setDocumentTypeActive(user, id, isActive) {
  assertAdmin(user);
  const rows = await referenceModel.findDocumentTypeById(id);
  if (!rows.length) throw notFound('Document type not found.');

  await referenceModel.setDocumentTypeActive(id, Boolean(isActive));
  const affectedDocuments = await referenceModel.countDocumentsUsingType(rows[0].name);

  return {
    message: isActive
      ? 'Document type restored and is requestable again.'
      : 'Document type deactivated. Existing requests are unaffected.',
    affected_documents: affectedDocuments,
  };
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

async function listStaff(user) {
  assertAdmin(user);
  return { staff: await userModel.listStaff() };
}

/**
 * Create a staff account with a temporary password.
 *
 * The account is flagged `must_change_password`, so the admin-chosen secret is
 * only usable once — the user must set their own before doing anything else.
 * The password is never returned or logged.
 */
async function createStaff(user, data) {
  assertAdmin(user);

  const { employee_id, full_name, email, password, role, desk_assignment, course, phone_number } = data;

  if (!employee_id || !employee_id.trim()) throw badRequest('Employee ID is required.');
  if (!full_name || !full_name.trim()) throw badRequest('Full name is required.');
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!VALID_ROLES.includes(role)) throw badRequest("Role must be 'clerk' or 'admin'.");
  if (role === 'clerk' && !VALID_DESKS.includes(desk_assignment)) {
    throw badRequest(`Desk assignment must be one of: ${VALID_DESKS.join(', ')}.`);
  }

  const existing = await userModel.findExistingByStudentId(employee_id.trim());
  if (existing.length) throw badRequest('That Employee/Student ID is already taken.');

  const password_hash = await bcrypt.hash(password, 10);
  const [result] = await userModel.createStaff({
    student_id: employee_id.trim(),
    full_name: full_name.trim(),
    email,
    password_hash,
    role,
    desk_assignment: role === 'admin' ? desk_assignment || 'Admin Office' : desk_assignment,
    course,
    phone_number,
  });

  return {
    message: 'Staff account created. The user must change this temporary password at first login.',
    id: result.insertId,
  };
}

async function updateStaff(user, id, data) {
  assertAdmin(user);

  const rows = await userModel.findById(id);
  if (!rows.length || !VALID_ROLES.includes(rows[0].role)) throw notFound('Staff account not found.');

  const fields = {};
  if (data.full_name !== undefined) {
    if (!String(data.full_name).trim()) throw badRequest('Full name cannot be empty.');
    fields.full_name = data.full_name.trim();
  }
  if (data.email !== undefined) fields.email = data.email;
  if (data.phone_number !== undefined) fields.phone_number = data.phone_number;
  if (data.course !== undefined) fields.course = data.course;

  if (data.role !== undefined) {
    if (!VALID_ROLES.includes(data.role)) throw badRequest("Role must be 'clerk' or 'admin'.");
    fields.role = data.role;
  }
  if (data.desk_assignment !== undefined) {
    if (!VALID_DESKS.includes(data.desk_assignment)) {
      throw badRequest(`Desk assignment must be one of: ${VALID_DESKS.join(', ')}.`);
    }
    fields.desk_assignment = data.desk_assignment;
  }

  // Resetting a password re-arms the forced change, so the new temporary value
  // is again single-use.
  if (data.password) {
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      throw badRequest(`Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    fields.password_hash = await bcrypt.hash(data.password, 10);
    fields.must_change_password = true;
  }

  if (Object.keys(fields).length === 0) throw badRequest('No fields to update.');

  await userModel.updateStaff(id, fields);
  return { message: 'Staff account updated.' };
}

/**
 * Deactivate or restore a staff account. Accounts are never deleted — their id
 * appears throughout `step_logs` as the clerk who handled a document.
 */
async function setStaffActive(user, id, isActive) {
  assertAdmin(user);

  const rows = await userModel.findById(id);
  if (!rows.length || !VALID_ROLES.includes(rows[0].role)) throw notFound('Staff account not found.');

  // Guard against an admin locking themselves out of the system.
  if (!isActive && Number(id) === Number(user.id)) {
    throw badRequest('You cannot deactivate your own account.');
  }

  await userModel.setUserActive(id, Boolean(isActive));
  return { message: isActive ? 'Staff account reactivated.' : 'Staff account deactivated.' };
}

module.exports = {
  VALID_DESKS,
  VALID_ROLES,
  listColleges, createCollege, updateCollege, setCollegeActive,
  listDocumentTypes, createDocumentType, updateDocumentType, setDocumentTypeActive,
  listStaff, createStaff, updateStaff, setStaffActive,
};
