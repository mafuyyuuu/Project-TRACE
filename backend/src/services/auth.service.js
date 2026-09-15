const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const passwordResetModel = require('../models/passwordReset.model');
const aiEngine = require('./aiEngine.service');
const notifications = require('./notification.service');
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');
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
      user_type: user.user_type,
      desk_assignment: user.desk_assignment,
      course: user.course,
      profile_picture: user.profile_picture || null,
      // Set for staff accounts created with an admin-chosen temporary password.
      // The client must send the user to a password change before anything else.
      must_change_password: Boolean(user.must_change_password),
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
  if (password) {
    fields.password_hash = await bcrypt.hash(password, 10);
    // Choosing a password satisfies the forced-change requirement.
    fields.must_change_password = false;
  }

  const updated = await userModel.updateProfile(userId, fields);
  if (!updated) {
    throw badRequest('No fields to update.');
  }

  return { message: 'Profile updated successfully.' };
}

/**
 * Replace the caller's avatar with a freshly uploaded image.
 *
 * Only the filename is stored — the bytes stay in UPLOAD_DIR and are read back
 * through the authenticated /api/files route, so an avatar is never public.
 * The previous file is removed best-effort: a failed unlink leaves an orphan
 * on disk, which is preferable to failing an otherwise successful update.
 */
async function updateProfilePicture(userId, file) {
  if (!file) {
    throw badRequest('No image was uploaded.');
  }

  const previous = await userModel.findProfilePictureById(userId);
  const previousName = previous[0] && previous[0].profile_picture;

  await userModel.updateProfile(userId, { profile_picture: file.filename });

  if (previousName && previousName !== file.filename) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(previousName)));
    } catch {
      // Already gone, or never written to disk. Nothing to clean up.
    }
  }

  return { message: 'Profile picture updated.', profile_picture: file.filename };
}

async function listNotifications(userId) {
  return { notifications: await notificationModel.findByUserId(userId, 50) };
}

async function markNotificationsRead(userId) {
  await notificationModel.markAllRead(userId);
  return { message: 'Notifications marked as read.' };
}

// ---------------------------------------------------------------------------
// Password recovery
// ---------------------------------------------------------------------------

/** How long an emailed reset link stays usable. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Tokens are stored hashed, so this is the only way back to a stored row. */
function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Begin a password reset.
 *
 * Always resolves the same way whether or not the account exists — otherwise
 * the endpoint becomes an oracle for which student IDs and emails are
 * registered. The caller is told "if the account exists, a link has been sent"
 * in every case.
 */
async function requestPasswordReset({ identifier }) {
  if (!identifier || !String(identifier).trim()) {
    throw badRequest('Enter your Student ID / Staff ID or your email address.');
  }

  const generic = {
    message:
      'If that account exists, a password reset link has been sent to its registered email address.',
  };

  const rows = await userModel.findActiveByStudentIdOrEmail(String(identifier).trim());
  if (rows.length === 0) return generic;

  const user = rows[0];

  // No email on file means there is nowhere to send the link. Silently stop:
  // saying so out loud would leak that the account exists.
  if (!user.email) return generic;

  // Only the newest link should work, so retire any earlier outstanding ones.
  await passwordResetModel.invalidateAllForUser(user.id);

  const token = crypto.randomBytes(32).toString('hex');
  await passwordResetModel.create({
    user_id: user.id,
    token_hash: hashResetToken(token),
    expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const base = (env.FRONTEND_URL.split(',')[0] || '').trim() || 'http://localhost:5273';
  const link = `${base.replace(/\/$/, '')}/reset-password?token=${token}`;

  const sent = await notifications.sendEmail(
    user.email,
    'Password reset request',
    `Hi ${user.full_name ? user.full_name.split(',')[0] : 'there'},\n\n` +
      `A password reset was requested for ${user.student_id}. Open the link below within the hour to choose a new password:\n\n` +
      `${link}\n\n` +
      `If you did not request this, you can ignore this email — your password will not change.`
  );

  // Email is optional configuration (see notification.service.js). Without it
  // the flow would be untestable, so surface the link on the server console
  // rather than failing silently — matching how every other channel here
  // reports being unconfigured instead of erroring opaquely.
  if (!sent.ok) {
    console.warn(
      `⚠️  [Password reset] Email not delivered (${sent.reason}).\n` +
        `   Reset link for ${user.student_id}: ${link}`
    );
  }

  return generic;
}

/**
 * Complete a password reset.
 *
 * The token is single-use and time-limited, both enforced in SQL. A successful
 * reset also retires the user's other outstanding tokens, so an older link
 * still sitting in an inbox cannot be used to take the account back.
 */
async function resetPassword({ token, password }) {
  if (!token || !password) {
    throw badRequest('A reset token and a new password are required.');
  }
  if (String(password).length < 8) {
    throw badRequest('Password must be at least 8 characters.');
  }

  const rows = await passwordResetModel.findUsableByTokenHash(hashResetToken(String(token)));
  if (rows.length === 0) {
    throw badRequest('This reset link is invalid or has expired. Please request a new one.');
  }

  const reset = rows[0];
  const password_hash = await bcrypt.hash(password, 10);

  await userModel.updateProfile(reset.user_id, {
    password_hash,
    // Choosing a password satisfies any pending forced-change requirement.
    must_change_password: false,
  });
  await passwordResetModel.markUsed(reset.id);
  await passwordResetModel.invalidateAllForUser(reset.user_id);

  return { message: 'Password updated. You can now sign in with your new password.' };
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
  updateProfilePicture,
  requestPasswordReset,
  resetPassword,
  listNotifications,
  markNotificationsRead,
};
