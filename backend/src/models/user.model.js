const { pool } = require('../config/db');

/**
 * All raw SQL for the `users` table. Every function accepts an optional
 * `executor` (a pool or an in-flight transaction connection) so callers can
 * run these inside a transaction when needed — defaults to the shared pool.
 */

function findActiveByStudentId(studentId, executor = pool) {
  return executor
    .query('SELECT u.*, (SELECT COUNT(*) FROM grad_applications WHERE student_id = u.student_id) > 0 AS has_grad_application FROM users u WHERE u.student_id = ? AND u.is_active = TRUE', [studentId])
    .then(([rows]) => rows);
}

function getProfileById(userId, executor = pool, lock = false) {
  return executor
    .query(
      `SELECT u.id, u.student_id, u.email, u.email_verified_at, u.pending_email, u.token_version, u.full_name, u.role, u.user_type,
        u.desk_assignment, u.is_active, u.phone_number, u.course, u.program, u.college_id, u.id_proof_path,
        u.enrollment_status, u.study_load, u.must_change_password, u.profile_picture, u.created_at,
        p.extension_name, p.birth_date, p.place_of_birth, p.sex, p.civil_status, p.maiden_name,
        p.home_address, p.last_attendance_year, p.is_transfer_student, p.previous_school,
        p.elem_school, p.elem_grad_year, p.jhs_school, p.jhs_grad_year, p.shs_school, p.shs_grad_year,
        (SELECT COUNT(*) FROM grad_applications WHERE student_id = u.student_id) > 0 AS has_grad_application
       FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id
       WHERE u.id = ?${lock ? ' FOR UPDATE' : ''}`,
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
    role = 'student', user_type, course, program, college_id, id_proof_path, verification_status,
  } = data;
  return executor.query(
    `INSERT INTO users (student_id, full_name, email, phone_number, password_hash, role, user_type, course, program, college_id, id_proof_path, verification_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, full_name, email || null, phone_number, password_hash, role, user_type || 'student', course || null, program || null, college_id || null, id_proof_path, verification_status]
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
    .query('SELECT id, student_id, full_name, email, phone_number, user_type, desk_assignment, course, program, college_id, role, verification_status, enrollment_status, study_load, is_active, created_at FROM users ORDER BY created_at DESC')
    .then(([rows]) => rows);
}

function findStudentBasicInfo(studentId, executor = pool) {
  return executor
    .query(`SELECT u.id, u.student_id, u.full_name, u.email, u.phone_number, u.course, u.program, u.college_id,
      u.id_proof_path, u.user_type, u.role, u.is_active, u.profile_picture, u.created_at,
      u.enrollment_status, u.study_load, c.name AS college_name,
      p.extension_name, p.birth_date, p.place_of_birth, p.sex, p.civil_status, p.maiden_name,
      p.home_address, p.last_attendance_year, p.is_transfer_student, p.previous_school,
      p.elem_school, p.elem_grad_year, p.jhs_school, p.jhs_grad_year, p.shs_school, p.shs_grad_year
      FROM users u LEFT JOIN colleges c ON c.id = u.college_id
      LEFT JOIN student_profiles p ON p.user_id = u.id
      WHERE u.student_id = ? AND u.role = 'student'`, [studentId])
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
    .query('SELECT COALESCE(c.name, u.course) AS course, u.college_id FROM users u LEFT JOIN colleges c ON c.id = u.college_id WHERE u.id = ?', [userId])
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
    query += ' AND (college_id = (SELECT id FROM colleges WHERE name = ?) OR (college_id IS NULL AND course = ?))';
    params.push(course, course);
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
    .query('SELECT course, college_id FROM users WHERE student_id = ?', [studentId])
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
      `SELECT id, student_id, full_name, email, phone_number, user_type, college_id, role, desk_assignment, course,
              is_active, must_change_password, created_at
       FROM users WHERE role IN ('clerk', 'admin')${activeClause}
       ORDER BY role, desk_assignment, full_name`
    )
    .then(([rows]) => rows);
}

function findById(userId, executor = pool) {
  return executor.query('SELECT * FROM users WHERE id = ?', [userId]).then(([rows]) => rows);
}

/** Serialize request-policy checks for the same student, including concurrent submissions. */
function findStudentForPolicy(studentId, executor = pool, lock = false) {
  return executor.query(`SELECT id, student_id, user_type, course, college_id FROM users
    WHERE student_id = ? AND role = 'student'${lock ? ' FOR UPDATE' : ''}`, [studentId]).then(([rows]) => rows);
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
  return executor.query('UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?', [isActive, userId]);
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

function getPasswordHistory(userId, executor = pool, currentHash = '') {
  return executor
    .query(
    'SELECT password_hash, MAX(id) AS latest_id FROM password_history WHERE user_id = ? AND password_hash <> ? GROUP BY password_hash ORDER BY latest_id DESC LIMIT 3',
    [userId, currentHash]
    )
    .then(([rows]) => rows);
}

function addPasswordHistory(userId, hash, executor = pool) {
  return executor.query(
    'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)',
    [userId, hash]
  );
}


function logSecurityEvent(userId, eventType, ipAddress = null, userAgent = null, executor = pool) {
  return executor.query(
    'INSERT INTO security_logs (user_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
    [userId, eventType, ipAddress, userAgent]
  );
}

function getSecurityLogs(userId, executor = pool) {
  return executor.query(
    'SELECT event_type, ip_address, user_agent, created_at FROM security_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId]
  ).then(([rows]) => rows);
}


function getGlobalSecurityLogs(executor = pool) {
  return executor.query(
    'SELECT sl.event_type, sl.ip_address, sl.user_agent, sl.created_at, u.full_name, u.student_id, u.role FROM security_logs sl JOIN users u ON sl.user_id = u.id ORDER BY sl.created_at DESC LIMIT 100'
  ).then(([rows]) => rows);
}


function updateEmailOTP(userId, otp, expires, executor = pool) {
  return executor.query('UPDATE users SET login_otp = ?, login_otp_expires = ? WHERE id = ?', [otp, expires, userId]);
}

function clearEmailOTP(userId, executor = pool) {
  return executor.query('UPDATE users SET login_otp = NULL, login_otp_expires = NULL WHERE id = ?', [userId]);
}

function requestEmailChange(userId, email, otp, expires, executor = pool) {
  return executor.query('UPDATE users SET pending_email = ?, email_otp = ?, email_otp_expires = ? WHERE id = ?', [email, otp, expires, userId]);
}

function commitEmailChange(userId, email, executor = pool) {
  return executor.query('UPDATE users SET email = ?, pending_email = NULL, email_otp = NULL, email_otp_expires = NULL WHERE id = ?', [email, userId]);
}

function incrementTokenVersion(userId, executor = pool) {
  return executor.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
}

function findActiveAdmins(executor = pool) {
  return executor.query('SELECT id FROM users WHERE role = "admin" AND is_active = TRUE').then(([rows]) => rows);
}

module.exports = {
  findStudentForPolicy,
  findActiveAdmins,
  updateEmailOTP,
  clearEmailOTP,
  requestEmailChange,
  commitEmailChange,
  incrementTokenVersion,
  getGlobalSecurityLogs,
  logSecurityEvent,
  getSecurityLogs,
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
