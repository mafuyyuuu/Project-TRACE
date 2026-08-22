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
      'SELECT id, student_id, email, full_name, role, desk_assignment, is_active, phone_number, course, created_at FROM users WHERE id = ?',
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
    .query('SELECT id, student_id, full_name, email, course, role, verification_status, created_at FROM users ORDER BY created_at DESC')
    .then(([rows]) => rows);
}

function findStudentBasicInfo(studentId, executor = pool) {
  return executor
    .query('SELECT student_id, full_name, email, course, user_type FROM users WHERE student_id = ? AND role = "student"', [studentId])
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

module.exports = {
  findActiveByStudentId,
  getProfileById,
  findExistingByStudentId,
  deleteById,
  createUser,
  listPendingStudents,
  setVerificationStatus,
  listAllUsers,
  findStudentBasicInfo,
  updateProfile,
  findStudentIdById,
  findCourseById,
  findFinanceClerks,
  findSecretaryClerks,
  findWindow1Clerks,
  findStudentContactByStudentId,
  findClerkByEmployeeId,
  findStudentCourseByStudentId,
};
