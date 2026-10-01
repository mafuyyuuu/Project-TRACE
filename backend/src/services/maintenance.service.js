const bcrypt = require('bcryptjs');
const referenceModel = require('../models/referenceData.model');
const pricingModel = require('../models/pricing.model');
const { normalizedSchedule, moneyCents } = require('../utils/pricing');
const userModel = require('../models/user.model');
const notifications = require('./notification.service');
const accountLock = require('../models/trustedBrowser.model');
const documentPolicy = require('./documentPolicy.service');
const { pool } = require('../config/db');
const { PROVIDERS } = require('./payment');
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
  const rows = await pricingModel.attachSchedules(await referenceModel.listDocumentTypes({ includeInactive: true }));
  return { document_types: rows.map(row => ({ ...row,
    is_active: documentPolicy.isRetired(row.name) ? false : row.is_active,
    is_retired: documentPolicy.isRetired(row.name),
    is_repeatable: documentPolicy.repeatable(row),
    is_same_day: documentPolicy.sameDayWalkIn(row.name),
  })) };
}

async function validateDocumentPolicy(data, name) {
  if (data.available_to !== undefined && !['student', 'alumni', 'both'].includes(data.available_to)) throw badRequest('Choose student, alumni, or both.');
  if (data.registrar_attachment_rule !== undefined && !['none', 'optional', 'required'].includes(data.registrar_attachment_rule)) throw badRequest('Invalid attachment rule.');
  const fields = {};
  for (const key of ['is_repeatable', 'is_walk_in', 'requires_original', 'is_same_day', 'requires_attachment']) {
    if (data[key] !== undefined) {
      if (![true, false, 0, 1].includes(data[key])) throw badRequest(`Invalid ${key} value.`);
      fields[key] = Boolean(data[key]);
    }
  }
  fields.is_repeatable = documentPolicy.repeatable({ name });
  fields.is_same_day = documentPolicy.sameDayWalkIn(name);
  if (fields.is_same_day) { fields.is_walk_in = true; fields.requires_original = true; }
  if (data.allowed_college_ids !== undefined) {
    if (!Array.isArray(data.allowed_college_ids) || data.allowed_college_ids.some(id => !Number.isInteger(id) || id < 1)) throw badRequest('Choose valid colleges.');
    fields.allowed_college_ids = [...new Set(data.allowed_college_ids)];
    for (const id of fields.allowed_college_ids) {
      if (!(await referenceModel.findCollegeById(id)).length) throw badRequest('Unknown college.');
    }
  }
  return { ...data, ...fields };
}

async function validateFees(data) {
  const result = { ...data };
  try {
    for (const key of ['base_fee', 'rental_fee', 'special_fee']) {
      if (data[key] !== undefined) result[key] = moneyCents(data[key]) / 100;
    }
    if (data.fee_items !== undefined) result.fee_items = normalizedSchedule({ fee_items: data.fee_items }).fee_items;
    if (data.college_fee_schedules !== undefined) {
      if (!Array.isArray(data.college_fee_schedules) || data.college_fee_schedules.length > 100) throw new Error('Use at most 100 college overrides.');
      const seen = new Set();
      result.college_fee_schedules = [];
      for (const row of data.college_fee_schedules) {
        if (!Number.isInteger(row?.college_id) || row.college_id < 1 || seen.has(row.college_id)) throw new Error('Choose a unique college for each override.');
        seen.add(row.college_id);
        if (!(await referenceModel.findCollegeById(row.college_id)).length) throw new Error('Unknown college.');
        if (row.base_fee === undefined || row.fee_rule === undefined) throw new Error('Each college override needs its own rate and fee rule.');
        result.college_fee_schedules.push(normalizedSchedule(row));
      }
    }
  } catch (err) {
    if (err.status) throw err;
    throw badRequest(err.message);
  }
  return result;
}

async function saveDocumentPolicy(data, id = null) {
  // A legacy caller omitting college restrictions keeps the existing junction rows.
  if (data.allowed_college_ids === undefined && data.fee_items === undefined && data.college_fee_schedules === undefined) return id === null
    ? referenceModel.createDocumentType(data) : referenceModel.updateDocumentType(id, data);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = id === null ? await referenceModel.createDocumentType(data, connection) : await referenceModel.updateDocumentType(id, data, connection);
    const typeId = id ?? result[0].insertId;
    if (data.allowed_college_ids !== undefined) await referenceModel.setDocumentTypeColleges(typeId, data.allowed_college_ids, connection);
    if (data.fee_items !== undefined || data.college_fee_schedules !== undefined) await pricingModel.saveSchedules(typeId, data, connection);
    await connection.commit();
    return result;
  } catch (err) { await connection.rollback(); throw err; }
  finally { connection.release(); }
}

async function createDocumentType(user, data) {
  assertAdmin(user);
  if (!data.name || !data.name.trim()) throw badRequest('Document type name is required.');
  if (documentPolicy.isRetired(data.name)) throw badRequest(documentPolicy.RETIREMENT_REASON);

  const fee = data.base_fee === undefined ? (data.name.trim() === 'Diploma' ? 250 : 50) : Number(data.base_fee);
  if (!Number.isFinite(fee) || fee < 0) throw badRequest('Base fee must be a non-negative number.');
  if (data.fee_rule && !['flat', 'per_semester_block'].includes(data.fee_rule)) {
    throw badRequest("Fee rule must be 'flat' or 'per_semester_block'.");
  }

  const existing = await referenceModel.findDocumentTypeByName(data.name.trim());
  if (existing.length) throw badRequest('A document type with that name already exists.');

  const normalized = await validateDocumentPolicy(await validateFees({ ...data, name: data.name.trim(), base_fee: data.base_fee ?? fee }), data.name.trim());
  const [result] = await saveDocumentPolicy(normalized);
  return { message: 'Document type created.', id: result.insertId };
}

async function updateDocumentType(user, id, data) {
  assertAdmin(user);
  const rows = await referenceModel.findDocumentTypeById(id);
  if (!rows.length) throw notFound('Document type not found.');

  if (documentPolicy.isRetired(rows[0].name) || documentPolicy.isRetired(data.name)) {
    throw badRequest(documentPolicy.RETIREMENT_REASON);
  }

  if (data.base_fee !== undefined) {
    const fee = Number(data.base_fee);
    if (!Number.isFinite(fee) || fee < 0) throw badRequest('Base fee must be a non-negative number.');
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

  await saveDocumentPolicy(await validateDocumentPolicy(await validateFees(data), data.name || rows[0].name), id);
  return { message: 'Document type updated.' };
}

async function setDocumentTypeActive(user, id, isActive) {
  assertAdmin(user);
  const rows = await referenceModel.findDocumentTypeById(id);
  if (!rows.length) throw notFound('Document type not found.');
  if (isActive && documentPolicy.isRetired(rows[0].name)) throw badRequest(documentPolicy.RETIREMENT_REASON);

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

async function updateAccount(user, id, data) {
  assertAdmin(user);
  const [account] = await userModel.findById(id);
  if (!account) throw notFound('Account not found.');
  if (data.student_id !== undefined || data.employee_id !== undefined) throw badRequest('Account identifiers are read-only.');
  const fields = {};
  for (const [key, max] of Object.entries({ full_name: 255, email: 255, phone_number: 20, course: 100 })) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== 'string' || data[key].length > max) throw badRequest(`Invalid ${key}. Maximum ${max} characters.`);
    fields[key] = data[key].trim();
  }
  if (fields.full_name === '') throw badRequest('Full name cannot be empty.');
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw badRequest('Enter a valid email address.');
  if (data.college_id !== undefined) {
    if (data.college_id !== null && data.college_id !== '') {
      const idValue = Number(data.college_id);
      if (!Number.isInteger(idValue) || idValue < 1 || !(await referenceModel.findCollegeById(idValue)).length) throw badRequest('Choose a valid college.');
      fields.college_id = idValue;
    } else fields.college_id = null;
  }
  if (!Object.keys(fields).length) throw badRequest('No fields to update.');
  await userModel.updateProfile(id, fields);
  return { message: 'Account updated.' };
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

  if (Number(id) === Number(user.id) && fields.role && fields.role !== 'admin') throw badRequest('You cannot remove your own Admin role.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await accountLock.lockAccount(id, connection);
    if (!locked || !VALID_ROLES.includes(locked.role)) throw notFound('Staff account not found.');
    await userModel.updateStaff(id, fields, connection);
    await userModel.incrementTokenVersion(id, connection);
    await userModel.clearEmailOTP(id, connection);
    await userModel.logSecurityEvent(user.id, `ACCOUNT_UPDATED:${id}`, null, null, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  require('../realtime').disconnectUser(id);
  return { message: 'Staff account updated.' };
}

/**
 * Deactivate or restore a staff account. Accounts are never deleted — their id
 * appears throughout `step_logs` as the clerk who handled a document.
 */
async function setStaffActive(user, id, isActive) {
  assertAdmin(user);
  if (typeof isActive !== 'boolean') throw badRequest('Choose activate or deactivate.');
  if (!isActive && Number(id) === Number(user.id)) throw badRequest('You cannot deactivate your own account.');
  const connection = await pool.getConnection();
  let account;
  try {
    await connection.beginTransaction();
    account = await accountLock.lockAccount(id, connection);
    if (!account || !VALID_ROLES.includes(account.role)) throw notFound('Staff account not found.');
    await userModel.setUserActive(id, isActive, connection);
    await userModel.clearEmailOTP(id, connection);
    await userModel.logSecurityEvent(user.id, `${isActive ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED'}:${id}`, null, null, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  require('../realtime').disconnectUser(id);
  try {
    const [owner] = await userModel.findById(id);
    if (owner?.email) await notifications.sendEmail(owner.email, isActive ? 'Account Reactivated' : 'Account Deactivated',
      `Your TRACE staff account was ${isActive ? 'reactivated' : 'deactivated'} by an administrator. If you did not expect this, contact the registrar administrator.`);
  } catch { console.warn('Account status notification unavailable.'); }
  return { message: isActive ? 'Staff account reactivated.' : 'Staff account deactivated.' };
}

// ---------------------------------------------------------------------------
// Payment methods
//
// Same deletion-is-deactivation rule as above. `code` is immutable once
// created (see the model) because `documents.payment_method` stores it
// directly — renaming it would break the lookup for every document that
// already used it. `provider` must name a registered provider in
// `services/payment/`, or a later checkout would fail with a 400 the admin
// never sees coming.
// ---------------------------------------------------------------------------

async function listPaymentMethods(user) {
  assertAdmin(user);
  return { payment_methods: await referenceModel.listPaymentMethods({ includeInactive: true }) };
}

async function createPaymentMethod(user, data) {
  assertAdmin(user);

  const code = String(data.code || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(code)) {
    throw badRequest('Code must start with a letter and contain only lowercase letters, numbers and underscores.');
  }
  if (!data.name || !data.name.trim()) throw badRequest('Payment method name is required.');

  const provider = data.provider || 'manual';
  if (!PROVIDERS[provider]) throw badRequest(`Unknown payment provider "${provider}".`);

  const existing = await referenceModel.findPaymentMethodByCode(code);
  if (existing.length) throw badRequest('A payment method with that code already exists.');

  const [result] = await referenceModel.createPaymentMethod({ ...data, code, name: data.name.trim(), provider });
  return { message: 'Payment method created.', id: result.insertId };
}

async function updatePaymentMethod(user, id, data) {
  assertAdmin(user);
  const rows = await referenceModel.findPaymentMethodById(id);
  if (!rows.length) throw notFound('Payment method not found.');

  if (data.provider && !PROVIDERS[data.provider]) {
    throw badRequest(`Unknown payment provider "${data.provider}".`);
  }

  await referenceModel.updatePaymentMethod(id, data);
  return { message: 'Payment method updated.' };
}

async function setPaymentMethodActive(user, id, isActive) {
  assertAdmin(user);
  const rows = await referenceModel.findPaymentMethodById(id);
  if (!rows.length) throw notFound('Payment method not found.');

  await referenceModel.setPaymentMethodActive(id, Boolean(isActive));
  return {
    message: isActive
      ? 'Payment method restored and available at checkout again.'
      : 'Payment method deactivated. Students can no longer select it; past payments are unaffected.',
  };
}

module.exports = {
  updateAccount,
  VALID_DESKS,
  VALID_ROLES,
  listColleges, createCollege, updateCollege, setCollegeActive,
  listDocumentTypes, createDocumentType, updateDocumentType, setDocumentTypeActive,
  listStaff, createStaff, updateStaff, setStaffActive,
  listPaymentMethods, createPaymentMethod, updatePaymentMethod, setPaymentMethodActive,
};
