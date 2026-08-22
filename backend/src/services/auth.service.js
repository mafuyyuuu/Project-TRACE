const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const aiEngine = require('./aiEngine.service');
const { badRequest, unauthorized, forbidden, notFound } = require('../utils/AppError');

/**
 * Authenticate by student/employee ID + password, returning a 24h JWT.
 * Students must be verified before they can log in; staff bypass that check.
 */
async function login({ employee_id, password }) {
  if (!employee_id || !password) {
    throw badRequest('Employee ID and password are required.');
  }

  const rows = await userModel.findActiveByStudentId(employee_id);
  if (rows.length === 0) {
    throw unauthorized('Invalid credentials.');
  }

  const user = rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw unauthorized('Invalid credentials.');
  }

  if (user.role === 'student' && user.verification_status !== 'verified') {
    throw forbidden('Your account is pending verification. Please wait for an admin to approve your request.');
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      desk_assignment: user.desk_assignment,
      course: user.course,
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      student_id: user.student_id,
      full_name: user.full_name,
      role: user.role,
      desk_assignment: user.desk_assignment,
      course: user.course,
    },
  };
}

async function getCurrentUser(userId) {
  const rows = await userModel.getProfileById(userId);
  if (rows.length === 0) {
    throw notFound('User not found.');
  }
  return { user: rows[0] };
}

/**
 * Register a student/alumni account with proof of ID.
 *
 * The AI engine attempts 3-point verification (school name, student ID,
 * course) on the uploaded ID; on a match the account is auto-verified,
 * otherwise it stays 'pending' for manual admin review. A previously
 * *rejected* student ID is deleted first so the student can re-register.
 */
async function register(body, file) {
  const { employee_id, full_name, email, phone_number, password, user_type, course } = body;

  if (!employee_id || !full_name || !password || !phone_number) {
    throw badRequest('Student ID, Name, Phone Number, and Password are required.');
  }
  if (!file) {
    throw badRequest('Proof of ID/Diploma is required for verification.');
  }

  const existing = await userModel.findExistingByStudentId(employee_id);
  if (existing.length > 0) {
    if (existing[0].verification_status === 'rejected') {
      await userModel.deleteById(existing[0].id);
    } else {
      throw badRequest('Student ID is already registered.');
    }
  }

  const password_hash = await bcrypt.hash(password, 10);
  const id_proof_path = file.path;

  let verification_status = 'pending';
  const aiResult = await aiEngine.verifyIdDocument(file, { studentId: employee_id, course });
  if (aiResult && aiResult.verified) {
    verification_status = 'verified';
    console.log(`✅ AI Auto-Verified user ${employee_id}: ${aiResult.reason}`);
  } else if (aiResult) {
    console.log(`⚠️ AI could not auto-verify user ${employee_id}: ${aiResult.reason}`);
  }

  await userModel.createUser({
    student_id: employee_id,
    full_name,
    email,
    phone_number,
    password_hash,
    role: 'student',
    user_type,
    course,
    id_proof_path,
    verification_status,
  });

  return verification_status === 'verified'
    ? { message: 'Registration successful. Your account was automatically verified by AI!' }
    : { message: 'Registration successful. AI could not automatically verify your ID. Please wait for administrator verification.' };
}

async function listPendingStudents(requestingUser) {
  if (requestingUser.role !== 'admin') {
    throw forbidden('Access denied. Admin role required.');
  }
  return { pending_students: await userModel.listPendingStudents() };
}

async function verifyStudentAccount(requestingUser, userId, action) {
  if (requestingUser.role !== 'admin') {
    throw forbidden('Access denied. Admin role required.');
  }
  if (!['verify', 'reject'].includes(action)) {
    throw badRequest('Invalid action. Must be verify or reject.');
  }

  const newStatus = action === 'verify' ? 'verified' : 'rejected';
  const [result] = await userModel.setVerificationStatus(userId, newStatus);

  if (result.affectedRows === 0) {
    throw notFound('Pending student user not found.');
  }

  return { message: `Student account successfully ${newStatus}.` };
}

async function listAllUsers(requestingUser) {
  if (requestingUser.role !== 'admin') {
    throw forbidden('Access denied. Admin role required.');
  }
  return { users: await userModel.listAllUsers() };
}

async function lookupStudent(studentId) {
  const rows = await userModel.findStudentBasicInfo(studentId);
  if (rows.length === 0) {
    throw notFound('Student not found.');
  }
  return { student: rows[0] };
}

/** Partial profile update — only the fields actually supplied are written. */
async function updateProfile(userId, { phone_number, email, course, password }) {
  const fields = {};
  if (phone_number !== undefined) fields.phone_number = phone_number;
  if (email !== undefined) fields.email = email;
  if (course !== undefined) fields.course = course;
  if (password) fields.password_hash = await bcrypt.hash(password, 10);

  const updated = await userModel.updateProfile(userId, fields);
  if (!updated) {
    throw badRequest('No fields to update.');
  }

  return { message: 'Profile updated successfully.' };
}

async function listNotifications(userId) {
  return { notifications: await notificationModel.findByUserId(userId, 50) };
}

async function markNotificationsRead(userId) {
  await notificationModel.markAllRead(userId);
  return { message: 'Notifications marked as read.' };
}

module.exports = {
  login,
  getCurrentUser,
  register,
  listPendingStudents,
  verifyStudentAccount,
  listAllUsers,
  lookupStudent,
  updateProfile,
  listNotifications,
  markNotificationsRead,
};
