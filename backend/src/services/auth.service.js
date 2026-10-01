const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!regex.test(password)) {
    throw badRequest('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
  }
}

async function checkPasswordHistory(userId, newPassword) {
  const history = await userModel.getPasswordHistory(userId);
  for (const row of history) {
    if (await bcrypt.compare(newPassword, row.password_hash)) {
      throw badRequest('You cannot reuse any of your last 3 passwords.');
    }
  }
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const referenceModel = require('../models/referenceData.model');
const { pool } = require('../config/db');
const notificationModel = require('../models/notification.model');
const passwordResetModel = require('../models/passwordReset.model');
const trustedBrowser = require('./trustedBrowser.service');
const trustedBrowserModel = require('../models/trustedBrowser.model');
const authenticator = require('./authenticator.service');
const aiEngine = require('./aiEngine.service');
const notifications = require('./notification.service');
const sendAuthEmail = ({ email, title, message }) => notifications.sendEmail(email, title, message);
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');
const { badRequest, unauthorized, forbidden, notFound } = require('../utils/AppError');

/**
 * Authenticate by student/employee ID + password, returning a 24h JWT.
 * Students must be verified before they can log in; staff bypass that check.
 */

/** Separate login and email-change challenges; reject invalid/null expiries. */
function otpExpired(value) {
  const expires = new Date(value).getTime();
  return !value || !Number.isFinite(expires) || expires <= Date.now();
}

function publicUser(user) {
  const fields = ['id', 'student_id', 'full_name', 'role', 'user_type', 'desk_assignment',
    'course', 'college_id', 'email', 'phone_number', 'profile_picture', 'verification_status'];
  const result = Object.fromEntries(fields.map(key => [key, user[key] ?? null]));
  for (const key of ['profile_completed', 'must_change_password', 'has_grad_application']) {
    result[key] = Boolean(user[key]);
  }
  return result;
}

function createSession(user) {
  return {
    message: 'Login successful.',
    token: jwt.sign({ id: user.id, role: user.role, full_name: user.full_name,
      desk_assignment: user.desk_assignment, course: user.course, user_type: user.user_type,
      token_version: user.token_version ?? 0 }, env.JWT_SECRET, { expiresIn: '24h' }),
    user: publicUser(user),
  };
}

async function login({ employee_id, password, shared_computer = true }, ipAddress, userAgent, cookieHeader = '') {

  const secRows = await userModel.getLoginSecurity(employee_id);
  if (secRows.length > 0) {
    const sec = secRows[0];
    if (sec.locked_until && new Date(sec.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(sec.locked_until) - new Date()) / 60000);
      throw badRequest(`Account locked. Try again in ${minutesLeft} minute(s).`);
    }
  }

  if (!employee_id || !password) {
    throw badRequest('Employee ID and password are required.');
  }

  const rows = await userModel.findActiveByStudentId(employee_id);
  
  const handleFail = async () => {
    if (secRows.length > 0) {
      const sec = secRows[0];
      const attempts = sec.failed_login_attempts + 1;
      if (attempts >= 5) {
        const until = new Date(Date.now() + 15 * 60000);
        await userModel.lockAccount(sec.id, until);
        throw unauthorized('Account locked for 15 minutes due to too many failed attempts.');
      } else {
        await userModel.incrementFailedLogin(sec.id);
        throw unauthorized(`Invalid ID or password. Attempt ${attempts} of 5.`);
      }
    }
    throw unauthorized('Invalid credentials.');
  };

  if (rows.length === 0) {
    await handleFail();
  }

  const user = rows[0];
  if (user.is_active === false || user.is_active === 0) throw unauthorized('Invalid credentials.');
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    await handleFail();
  }

  
  const isStaff = ['admin', 'clerk'].includes(user.role);
  const trusted = user.role === 'clerk' && shared_computer === false
    && await trustedBrowser.isTrusted(user, cookieHeader, shared_computer);
  const appEnabled = await authenticator.isEnabled(user.id);
  const requires2FA = (appEnabled || user.two_factor_enabled || isStaff) && !trusted;

  if (requires2FA) {
    if (appEnabled) return authenticator.challenge(user, user.role === 'clerk' && shared_computer === false);
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 5 * 60000); // 5 mins
    await userModel.updateEmailOTP(user.id, otp, expires);
    
    const notifications = require('./notification.service');
    if (sendAuthEmail && user.email) {
      await sendAuthEmail({
        email: user.email,
        title: 'Project TRACE Login Verification',
        message: `Your login verification code is: ${otp}. It expires in 5 minutes.`
      });
    }

    const canTrustBrowser = user.role === 'clerk' && shared_computer === false;
    const tempToken = jwt.sign({ id: user.id, pending_2fa: true,
      token_version: user.token_version ?? 0, can_trust_browser: canTrustBrowser }, env.JWT_SECRET, { expiresIn: '5m' });
    return { requires_2fa: true, temp_token: tempToken, email: user.email, can_trust_browser: canTrustBrowser };
  }

  if (user.role === 'student' && user.verification_status !== 'verified') {
    throw forbidden(`Account is ${user.verification_status}.`);
  }




  await userModel.logSecurityEvent(user.id, 'LOGIN', ipAddress, userAgent);
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      desk_assignment: user.desk_assignment,
      course: user.course,
      user_type: user.user_type,
      token_version: user.token_version ?? 0,
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    message: 'Login successful.',
    token,
    user: publicUser(user),
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
  const { employee_id, full_name, email, phone_number, password, user_type, course, college_id } = body;
  if (user_type && !['student', 'alumni'].includes(user_type)) throw badRequest('Invalid applicant type.');
  let collegeId = null;
  let collegeName = course;
  if (college_id !== undefined) {
    if (!Number.isInteger(Number(college_id)) || Number(college_id) < 1) throw badRequest('Choose a valid college.');
    const [college] = await referenceModel.findCollegeById(Number(college_id));
    if (!college || !college.is_active) throw badRequest('Choose an active college.');
    collegeId = college.id; collegeName = college.name;
  } else if (course) {
    const colleges = await referenceModel.findCollegeByName(course);
    collegeId = colleges.find(college => college.name === course)?.id || null;
  }

  if (!employee_id || !full_name || !password || !phone_number) {
    throw badRequest('Student / Alumni ID, Name, Phone Number, and Password are required.');
  }
  if (!file) {
    throw badRequest('Proof of ID/Diploma is required for verification.');
  }

  const existing = await userModel.findExistingByStudentId(employee_id);
  if (existing.length > 0) {
    if (existing[0].verification_status === 'rejected') {
      await userModel.deleteById(existing[0].id);
    } else {
      throw badRequest('This ID is already registered.');
    }
  }

  validatePassword(password);
  const password_hash = await bcrypt.hash(password, 10);
  const id_proof_path = file.path;

  let verification_status = 'pending';
  const aiResult = await aiEngine.verifyIdDocument(file, { studentId: employee_id, course: collegeName });
  if (aiResult && aiResult.verified) {
    verification_status = 'verified';
    console.log(`✅ AI Auto-Verified user ${employee_id}: ${aiResult.reason}`);
  } else if (aiResult) {
    console.log(`⚠️ AI could not auto-verify user ${employee_id}: ${aiResult.reason}`);
  }

  const [created] = await userModel.createUser({
    student_id: employee_id,
    full_name,
    email,
    phone_number,
    password_hash,
    role: 'student',
    user_type,
    course: collegeName,
    college_id: collegeId,
    id_proof_path,
    verification_status,
  });

  if (verification_status === 'pending') {
    try {
      const admins = await userModel.findActiveAdmins();
      await notifications.notifyInAppBulk(admins, {
        title: 'Account awaiting verification', message: `${full_name} has submitted an account for review.`,
        type: 'info', actionUrl: `/dashboard?reviewAccount=${created.insertId}`,
      });
    } catch (err) { console.warn('Registration notification unavailable:', err.message); }
  }
  const allowedReasons = new Set([
    'No text could be extracted from the image.',
    'School name and Student ID found, but College did not match.',
    'School name and College found, but Student ID did not match.',
    'Student ID and College matched, but School name not found.',
    'Could not verify all required fields (School name, Student ID, College).',
  ]);
  return {
    verification_status,
    verification_reason: verification_status === 'verified' ? null
      : allowedReasons.has(aiResult?.reason) ? aiResult.reason : 'Automatic verification was unavailable or inconclusive. An administrator will review your proof.',
    message: verification_status === 'verified'
      ? 'Registration successful. Your account was automatically verified by AI!'
      : 'Registration successful. Please wait for administrator verification.',
  };
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

async function lookupStudent(studentId, requestingUser) {
  const staff = requestingUser?.role === 'admin' || (requestingUser?.role === 'clerk' && ['Window 1', 'Secretary', 'Finance'].includes(requestingUser.desk_assignment));
  if (!staff) throw forbidden('Only authorized staff may view student profiles.');
  const rows = await userModel.findStudentBasicInfo(studentId);
  if (rows.length === 0) {
    throw notFound('Student not found.');
  }
  return { student: rows[0] };
}

/** Partial profile update — only the fields actually supplied are written. */



async function updateProfile(userId, { phone_number, email, course, password, current_password, ...profileFields }) {
  const fields = {};
  let verifiedPasswordHash;
  
  const users = await userModel.getProfileById(userId);
  if (!users || users.length === 0) throw notFound('User not found.');
  const currentUser = users[0];

  const emailChanged = (email !== undefined && email !== '' && email !== currentUser.email);

  if (emailChanged || password) {
    if (!current_password) {
      throw badRequest('Current password is required to change email or password.');
    }
    
    const pwdRows = await userModel.getProfileById(userId);
    if (!pwdRows || pwdRows.length === 0) throw notFound('User not found.');
    // getProfileById does not select password_hash. I will use a new method or existing one.
    // wait, findActiveByStudentId returns the full row including password_hash.
    const userRow = await userModel.findActiveByStudentId(pwdRows[0].student_id);
    if (!userRow || userRow.length === 0) throw notFound('User not found.');
    const match = await bcrypt.compare(current_password, userRow[0].password_hash);

    if (!match) {
      throw unauthorized('Incorrect current password.');
    }
    verifiedPasswordHash = userRow[0].password_hash;
  }


  if (phone_number !== undefined) fields.phone_number = phone_number;
  
  if (emailChanged) {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 15 * 60000); // 15 mins
    
    await userModel.requestEmailChange(userId, email, `E:${otp}`, expires);

    const nodemailer = require('nodemailer'); // Assumes we use notification.service
    const notifications = require('./notification.service');
    
    // Send OTP to new email
    if (sendAuthEmail) {
      await sendAuthEmail({
        email: email,
        title: 'Verify Your New Email',
        message: `Your verification code is: ${otp}. It expires in 15 minutes.`
      });
      // Notify old email
      await sendAuthEmail({
        email: currentUser.email,
        title: 'Email Change Requested',
        message: 'A request to change your email address was initiated. If this was not you, please contact support.'
      });
    }
    
    await userModel.logSecurityEvent(userId, 'EMAIL_CHANGE_REQUESTED');
    // We don't update fields.email yet!
  }

  if (course !== undefined) fields.course = course;
  
  if (password) {
    validatePassword(password);
    await checkPasswordHistory(userId, password);
    fields.password_hash = await bcrypt.hash(password, 10);
    fields.must_change_password = false;
    await writeCredentialsAndRevoke(userId, async connection => {
      await userModel.updateProfile(userId, fields, connection);
      await userModel.addPasswordHistory(userId, fields.password_hash, connection);
      await userModel.logSecurityEvent(userId, 'PASSWORD_CHANGE', null, null, connection);
    }, verifiedPasswordHash);
    
    // SEC-07 Email notification
    
    const userRows = await userModel.getProfileById(userId);

    if (userRows[0] && userRows[0].email) {
      const nodemailer = require('nodemailer'); // Assumes we use the same mailer. We have notification.service.js
      const notifications = require('./notification.service');
      if (sendAuthEmail) await sendAuthEmail({
        email: userRows[0].email,
        title: 'Password Changed',
        message: 'Your Project TRACE password was recently changed. If this was not you, please contact the administrator immediately.'
      });
    }
  }

  if (Object.keys(fields).length > 0 && !password) {
    await userModel.updateProfile(userId, fields);
  }

  // Handle student profile fields (PROF-01)
  const profileKeys = ['extension_name', 'birth_date', 'place_of_birth', 'sex', 'civil_status', 'maiden_name', 'home_address', 'last_attendance_year', 'is_transfer_student', 'previous_school', 'elem_school', 'elem_grad_year', 'jhs_school', 'jhs_grad_year', 'shs_school', 'shs_grad_year'];
  const hasProfileFields = profileKeys.some(key => profileFields[key] !== undefined);
  
  if (hasProfileFields) {
    await userModel.upsertProfile(userId, profileFields);
  }

  if (Object.keys(fields).length === 0 && !hasProfileFields && !emailChanged) {
    throw badRequest('No fields to update.');
  }

  return { message: emailChanged ? 'Profile saved. Verify the code sent to your new email.' : 'Profile updated successfully.', email_verification_required: emailChanged, pending_email: emailChanged ? email : null };
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





async function verify2FA(tempToken, otp, ipAddress, userAgent, trustBrowser = false, recoveryCode) {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, env.JWT_SECRET);
  } catch (err) {
    throw unauthorized('Invalid or expired 2FA token. Please log in again.');
  }

  if (!decoded.pending_2fa) {
    throw badRequest('Invalid token type.');
  }
  if (!Number.isInteger(decoded.id) || !Number.isInteger(decoded.token_version)) {
    throw unauthorized('Login verification has expired. Please log in again.');
  }

  if (decoded.mfa_method === 'authenticator') {
    const user = await authenticator.verifyChallenge(decoded, { code: otp, recovery_code: recoveryCode });
    const result = createSession(user);
    if (user.role === 'clerk' && decoded.can_trust_browser === true && trustBrowser === true) {
      const proof = await trustedBrowser.issue(user.id, decoded.token_version);
      if (proof) result.browserTrust = proof;
    }
    return result;
  }

  const [user] = await userModel.findById(decoded.id);
  if (!user || user.is_active === false || user.is_active === 0) throw notFound('User not found.');
  if (!Number.isInteger(decoded.token_version) || decoded.token_version !== (user.token_version ?? 0)) {
    throw unauthorized('Login verification has expired. Please log in again.');
  }
  if (await authenticator.isEnabled(user.id)) throw unauthorized('Verification method changed. Please log in again.');

  if (user.login_otp !== otp) {
    throw unauthorized('Invalid verification code.');
  }
  
  if (otpExpired(user.login_otp_expires)) {
    throw badRequest('Verification code expired.');
  }

  if (user.role === 'student' && user.verification_status !== 'verified') {
    throw forbidden(`Account is ${user.verification_status}.`);
  }
  // Clear OTP
  await userModel.clearEmailOTP(user.id);
  
  await userModel.logSecurityEvent(user.id, 'LOGIN', ipAddress, userAgent);

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      desk_assignment: user.desk_assignment,
      course: user.course,
      user_type: user.user_type,
      token_version: user.token_version ?? 0,
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const fresh = await userModel.getProfileById(user.id);
  const result = { message: 'Login successful.', token, user: publicUser(fresh[0] || user) };
  if (user.role === 'clerk' && decoded.can_trust_browser === true && trustBrowser === true) {
    const browserTrust = await trustedBrowser.issue(user.id, decoded.token_version);
    if (browserTrust) result.browserTrust = browserTrust; // Controller consumes; never include in JSON.
  }
  return result;
}

async function verifyEmailChange(userId, otp) {
  const [user] = await userModel.findById(userId);
  if (!user) throw notFound('User not found.');
  if (!user.pending_email || !user.email_otp) {
    throw badRequest('No email change requested.');
  }
  
  if (user.email_otp !== `E:${otp}`) {
    throw unauthorized('Invalid verification code.');
  }
  
  if (otpExpired(user.email_otp_expires)) {
    throw badRequest('Verification code expired.');
  }
  
  await userModel.commitEmailChange(userId, user.pending_email);
  
  await userModel.logSecurityEvent(userId, 'EMAIL_CHANGED');
  return { message: 'Email address updated successfully.' };
}

async function getGlobalSecurityLogs() {
  return await userModel.getGlobalSecurityLogs();
}

async function getSecurityLogs(userId) {
  return await userModel.getSecurityLogs(userId);
}

async function logout(user) {
  if (!/^[a-f0-9]{64}$/.test(user.session_hash || '') || !Number.isInteger(user.expires_at)) throw unauthorized('Invalid session.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await require('../models/session.model').revoke(user.id, user.session_hash, user.expires_at, connection);
    await userModel.logSecurityEvent(user.id, 'LOGOUT', null, null, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  require('../realtime').disconnectSession(user.session_hash);
  return { message: 'Session ended.' };
}
async function logoutAll(userId, preserveCurrent = false, expectedVersion) {
  if (!preserveCurrent) {
    await userModel.incrementTokenVersion(userId);
    require('../realtime').disconnectUser(userId);
    await userModel.logSecurityEvent(userId, 'LOGOUT_ALL');
    return { message: 'Successfully logged out of all devices.' };
  }
  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    const account = await trustedBrowserModel.lockAccount(userId, connection);
    if (!account?.is_active || account.token_version !== expectedVersion) throw unauthorized('Session expired.');
    await userModel.incrementTokenVersion(userId, connection);
    await userModel.clearEmailOTP(userId, connection);
    await userModel.logSecurityEvent(userId, 'LOGOUT_OTHER_DEVICES', null, null, connection);
    const [profile] = await userModel.getProfileById(userId, connection);
    result = { ...createSession({ ...profile, token_version: account.token_version + 1 }), message: 'Other sessions ended.' };
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  require('../realtime').disconnectUser(userId);
  return result;
}

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

  if (!sent.ok) console.warn('[Password reset] Email not delivered. Check SMTP configuration.');

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

  await writeCredentialsAndRevoke(reset.user_id, async connection => {
    // Recheck after locking the account: concurrent resets cannot consume the
    // same link or carry a credential update past a version revocation.
    const usable = await passwordResetModel.findUsableByTokenHash(hashResetToken(String(token)), connection);
    if (!usable.some(row => row.id === reset.id && row.user_id === reset.user_id)) {
      throw badRequest('This reset link is invalid or has expired. Please request a new one.');
    }
    await userModel.updateProfile(reset.user_id, { password_hash, must_change_password: false }, connection);
    await passwordResetModel.markUsed(reset.id, connection);
    await passwordResetModel.invalidateAllForUser(reset.user_id, connection);
  });

  const uRows = await userModel.findById(reset.user_id);
  if (uRows.length > 0 && uRows[0].email && sendAuthEmail) {
    await sendAuthEmail({
      email: uRows[0].email,
      title: 'Password Reset Successful',
      message: 'Your Project TRACE password has been successfully reset. If this was not you, please contact the administrator immediately.'
    });
  }

  return { message: 'Password updated. You can now sign in with your new password.' };
}

// Password writes and revocation commit together. This uses the existing
// account version; no trust table is needed to revoke old browser proofs.
async function writeCredentialsAndRevoke(userId, write, expectedPasswordHash) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const account = await trustedBrowserModel.lockAccount(userId, connection);
    if (!account || account.is_active === false || account.is_active === 0) throw notFound('User not found.');
    if (expectedPasswordHash && account.password_hash !== expectedPasswordHash) {
      throw unauthorized('Password changed. Please log in again.');
    }
    await write(connection);
    await userModel.incrementTokenVersion(userId, connection);
    await userModel.clearEmailOTP(userId, connection);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
  require('../realtime').disconnectUser(userId);
}

module.exports = {
  createSession,
  login,
  getCurrentUser,
  register,
  listPendingStudents,
  verifyStudentAccount,
  listAllUsers,
  lookupStudent,
  updateProfile,
  updateProfilePicture,
  verify2FA,
  verifyEmailChange,
  getGlobalSecurityLogs,
  getSecurityLogs,
  logout,
  logoutAll,
  requestPasswordReset,
  resetPassword,
  listNotifications,
  markNotificationsRead,
};
