const { pool } = require('../config/db');

/**
 * All raw SQL for the `users` table. Every function accepts an optional
 * `executor` (a pool or an in-flight transaction connection) so callers can
 * run these inside a transaction when needed — defaults to the shared pool.
 */

function findActiveByStudentId(studentId, executor = pool) {
  return executor
    .query('SELECT * FROM users WHERE student_id = ? AND is_active = TRUE', [studentId])
    .then(([rows]) => rows);
}

function getProfileById(userId, executor = pool) {
  return executor
    .query(
      'SELECT id, student_id, email, full_name, role, user_type, desk_assignment, is_active, phone_number, course, college_id, id_proof_path, enrollment_status, study_load, must_change_password, profile_picture, created_at FROM users WHERE id = ?',
      [userId]
    )
    .then(([rows]) => rows);
}

function findExistingByStudentId(studentId, executor = pool) {
  return executor
    .query('SELECT id, verification_status FROM users WHERE student_id = ?', [studentId])
    .then(([rows]) => rows);
}

function deleteById(userId, executor = pool) {
  return executor.query('DELETE FROM users WHERE id = ?', [userId]);
}

function createUser(data, executor = pool) {
  const {
    student_id, full_name, email, phone_number, password_hash,
    role = 'student', user_type, course, id_proof_path, verification_status,
  } = data;
  return executor.query(
    `INSERT INTO users (student_id, full_name, email, phone_number, password_hash, role, user_type, course, id_proof_path, verification_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, full_name, email || null, phone_number, password_hash, role, user_type || 'student', course || null, id_proof_path, verification_status]
  );
}

function listPendingStudents(executor = pool) {
  return executor
    .query(
      'SELECT id, student_id, email, full_name, role, user_type, id_proof_path, verification_status, created_at FROM users WHERE role = "student" AND verification_status = "pending"'
    )
    .then(([rows]) => rows);
}

function setVerificationStatus(userId, newStatus, executor = pool) {
  return executor.query(
    'UPDATE users SET verification_status = ? WHERE id = ? AND role = "student"',
    [newStatus, userId]
  );
}

function listAllUsers(executor = pool) {
  return executor
    .query('SELECT id, student_id, full_name, email, course, college_id, role, verification_status, enrollment_status, study_load, is_active, created_at FROM users ORDER BY created_at DESC')
    .then(([rows]) => rows);
}

function findStudentBasicInfo(studentId, executor = pool) {
  return executor
    .query('SELECT student_id, full_name, email, course, college_id, id_proof_path, user_type FROM users WHERE student_id = ? AND role = "student"', [studentId])
    .then(([rows]) => rows);
}

/**
 * Partial update — only columns present in `fields` are written.
 * Returns false if `fields` was empty (nothing to update).
 */
async function updateProfile(userId, fields, executor = pool) {
  const setClause = Object.keys(fields).map((col) => `${col} = ?`);
  if (setClause.length === 0) return false;
  const params = [...Object.values(fields), userId];
  await executor.query(`UPDATE users SET ${setClause.join(', ')} WHERE id = ?`, params);
  return true;
}

/**
 * Resolve an account from whatever the user typed into the forgot-password
 * form. Students know their student ID; staff more often reach for their email,
 * so accepting either avoids a dead end for half the users.
 *
 * Inactive accounts are excluded: a deactivated account must not be
 * recoverable by resetting its password.
 */
function findActiveByStudentIdOrEmail(identifier, executor = pool) {
  return executor
    .query(
      `SELECT id, student_id, full_name, email FROM users
        WHERE (student_id = ? OR email = ?) AND is_active = TRUE
        LIMIT 1`,
      [identifier, identifier]
    )
    .then(([rows]) => rows);
}

function findStudentIdById(userId, executor = pool) {
  return executor
    .query('SELECT student_id FROM users WHERE id = ?', [userId])
    .then(([rows]) => rows);
}

function findCourseById(userId, executor = pool) {
  return executor
    .query('SELECT course FROM users WHERE id = ?', [userId])
    .then(([rows]) => rows);
}

function findFinanceClerks(executor = pool) {
  return executor
    .query('SELECT id FROM users WHERE role = "clerk" AND desk_assignment = "Finance"')
    .then(([rows]) => rows);
}

function findSecretaryClerks(course, executor = pool) {
  let query = 'SELECT id FROM users WHERE role = "clerk" AND desk_assignment = "Secretary"';
  const params = [];
  if (course) {
    query += ' AND course = ?';
    params.push(course);
  }
  return executor.query(query, params).then(([rows]) => rows);
}

function findWindow1Clerks(executor = pool) {
  return executor
    .query('SELECT id FROM users WHERE role = "clerk" AND desk_assignment = "Window 1"')
    .then(([rows]) => rows);
}

/**
 * Superset of the contact fields the various notification call sites need
 * (id / full_name / phone_number / email) so one query covers all of them.
 */
function findStudentContactByStudentId(studentId, executor = pool) {
  return executor
    .query('SELECT id, full_name, phone_number, email FROM users WHERE student_id = ? AND role = "student"', [studentId])
    .then(([rows]) => rows);
}

function findClerkByEmployeeId(employeeId, executor = pool) {
  return executor
    .query('SELECT id FROM users WHERE student_id = ?', [employeeId])
    .then(([rows]) => rows);
}

function findStudentCourseByStudentId(studentId, executor = pool) {
  return executor
    .query('SELECT course FROM users WHERE student_id = ?', [studentId])
    .then(([rows]) => rows);
}

/** Find the user whose uploaded ID proof is this file. */
function findByIdProofFilename(filename, executor = pool) {
  return executor
    .query('SELECT id, student_id FROM users WHERE id_proof_path LIKE ? LIMIT 1', [`%${filename}`])
    .then(([rows]) => rows);
}

function findByProfilePictureFilename(filename, executor = pool) {
  return executor
    .query('SELECT id, student_id FROM users WHERE profile_picture LIKE ? LIMIT 1', [`%${filename}`])
    .then(([rows]) => rows);
}

function findProfilePictureById(userId, executor = pool) {
  return executor
    .query('SELECT profile_picture FROM users WHERE id = ?', [userId])
    .then(([rows]) => rows);
}

// ---------------------------------------------------------------------------
// Staff maintenance (admin)
// ---------------------------------------------------------------------------

function listStaff({ includeInactive = true } = {}, executor = pool) {
  const activeClause = includeInactive ? '' : ' AND is_active = TRUE';
  return executor
    .query(
      `SELECT id, student_id, full_name, email, role, desk_assignment, course,
              is_active, must_change_password, created_at
       FROM users WHERE role IN ('clerk', 'admin')${activeClause}
       ORDER BY role, desk_assignment, full_name`
    )
    .then(([rows]) => rows);
}

function findById(userId, executor = pool) {
  return executor.query('SELECT * FROM users WHERE id = ?', [userId]).then(([rows]) => rows);
}

/**
 * Create a staff account. `must_change_password` is set so the admin-chosen
 * temporary password cannot become a long-lived credential.
 */
function createStaff(data, executor = pool) {
  const { student_id, full_name, email, password_hash, role, desk_assignment, course, phone_number } = data;
  return executor.query(
    `INSERT INTO users
       (student_id, full_name, email, password_hash, role, desk_assignment, course,
        phone_number, verification_status, is_active, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified', TRUE, TRUE)`,
    [student_id, full_name, email || null, password_hash, role, desk_assignment || null,
     course || null, phone_number || null]
  );
}

function updateStaff(userId, fields, executor = pool) {
  const setClause = Object.keys(fields).map((col) => `${col} = ?`);
  if (setClause.length === 0) return Promise.resolve([{ affectedRows: 0 }]);
  return executor.query(
    `UPDATE users SET ${setClause.join(', ')} WHERE id = ? AND role IN ('clerk', 'admin')`,
    [...Object.values(fields), userId]
  );
}

function setUserActive(userId, isActive, executor = pool) {
  return executor.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, userId]);
}

/** Clears the forced-change flag once the user has chosen their own password. */
function clearMustChangePassword(userId, executor = pool) {
  return executor.query('UPDATE users SET must_change_password = FALSE WHERE id = ?', [userId]);
}


function upsertProfile(userId, profile, executor = pool) {
  return executor.query(
    `INSERT INTO student_profiles (
      user_id, extension_name, birth_date, place_of_birth, sex, civil_status, maiden_name,
      home_address, last_attendance_year, is_transfer_student, previous_school,
      elem_school, elem_grad_year, jhs_school, jhs_grad_year, shs_school, shs_grad_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      extension_name = VALUES(extension_name),
      birth_date = VALUES(birth_date),
      place_of_birth = VALUES(place_of_birth),
      sex = VALUES(sex),
      civil_status = VALUES(civil_status),
      maiden_name = VALUES(maiden_name),
      home_address = VALUES(home_address),
      last_attendance_year = VALUES(last_attendance_year),
      is_transfer_student = VALUES(is_transfer_student),
      previous_school = VALUES(previous_school),
      elem_school = VALUES(elem_school),
      elem_grad_year = VALUES(elem_grad_year),
      jhs_school = VALUES(jhs_school),
      jhs_grad_year = VALUES(jhs_grad_year),
      shs_school = VALUES(shs_school),
      shs_grad_year = VALUES(shs_grad_year)`,
    [
      userId,
      profile.extension_name || null,
      profile.birth_date || null,
      profile.place_of_birth || null,
      profile.sex || null,
      profile.civil_status || null,
      profile.maiden_name || null,
      profile.home_address || null,
      profile.last_attendance_year || null,
      profile.is_transfer_student ? 1 : 0,
      profile.previous_school || null,
      profile.elem_school || null,
      profile.elem_grad_year || null,
      profile.jhs_school || null,
      profile.jhs_grad_year || null,
      profile.shs_school || null,
      profile.shs_grad_year || null
    ]
  );
}


function getLoginSecurity(identifier, executor = pool) {
  return executor
    .query(
      'SELECT id, failed_login_attempts, locked_until FROM users WHERE student_id = ? OR email = ? LIMIT 1',
      [identifier, identifier]
    )
    .then(([rows]) => rows);
}

function incrementFailedLogin(userId, executor = pool) {
  return executor.query(
    'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?',
    [userId]
  );
}

function lockAccount(userId, until, executor = pool) {
  return executor.query(
    'UPDATE users SET locked_until = ? WHERE id = ?',
    [until, userId]
  );
}

function resetLoginSecurity(userId, executor = pool) {
  return executor.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
    [userId]
  );
}

function getPasswordHistory(userId, executor = pool) {
  return executor
    .query(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
      [userId]
    )
    .then(([rows]) => rows);
}

function addPasswordHistory(userId, hash, executor = pool) {
  return executor.query(
    'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)',
    [userId, hash]
  );
}

module.exports = {
  getLoginSecurity,
  incrementFailedLogin,
  lockAccount,
  resetLoginSecurity,
  getPasswordHistory,
  addPasswordHistory,
  upsertProfile,
  listStaff,
  findById,
  createStaff,
  updateStaff,
  setUserActive,
  clearMustChangePassword,
  findActiveByStudentId,
  findByIdProofFilename,
  findByProfilePictureFilename,
  findProfilePictureById,
  getProfileById,
  findExistingByStudentId,
  deleteById,
  createUser,
  listPendingStudents,
  setVerificationStatus,
  listAllUsers,
  findStudentBasicInfo,
  updateProfile,
  findActiveByStudentIdOrEmail,
  findStudentIdById,
  findCourseById,
  findFinanceClerks,
  findSecretaryClerks,
  findWindow1Clerks,
  findStudentContactByStudentId,
  findClerkByEmployeeId,
  findStudentCourseByStudentId,
};
