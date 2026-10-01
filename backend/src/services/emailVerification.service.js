const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const model = require('../models/emailVerification.model');
const users = require('../models/user.model');
const passwordResets = require('../models/passwordReset.model');
const { pool } = require('../config/db');
const env = require('../config/env');
const notifications = require('./notification.service');
const { badRequest, notFound } = require('../utils/AppError');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function emailAddress(value) {
  if (typeof value !== 'string' || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw badRequest('Enter a valid email address.');
  return value.trim().toLowerCase();
}
function frontendUrl() {
  const origin = env.FRONTEND_URL.split(',')[0].trim() || 'http://localhost:5273';
  return origin.replace(/\/$/, '');
}
async function notice(email, title, message) {
  try { return await notifications.sendEmail(email, title, message); }
  catch { return { ok: false }; }
}
async function issue(userId, { email, current_password } = {}) {
  const kind = email === undefined ? 'signup' : 'change';
  const target = kind === 'change' ? emailAddress(email) : null;
  const connection = await pool.getConnection();
  let account, destination, token;
  try {
    await connection.beginTransaction();
    account = await model.lockAccount(userId, connection);
    if (!account?.is_active) throw notFound('Account not found.');
    destination = target || emailAddress(account.email);
    if (kind === 'signup' && account.email_verified_at) { await connection.commit(); return { message: 'Your email is already verified.', already_verified: true }; }
    if (kind === 'change') {
      if (typeof current_password !== 'string' || !await bcrypt.compare(current_password, account.password_hash)) throw badRequest('Confirm your current password before changing email.');
      if (destination === account.email?.toLowerCase()) throw badRequest('Enter a different email address.');
    }
    if (await model.recentlySent(userId, kind, connection)) throw badRequest('Wait 60 seconds before requesting another verification link.');
    token = crypto.randomBytes(32).toString('hex');
    await model.invalidate(userId, kind, connection);
    await model.create(userId, kind, destination, hash(token), account.token_version, connection);
    if (kind === 'change') await users.updateProfile(userId, { pending_email: destination, email_otp: null, email_otp_expires: null }, connection);
    await users.logSecurityEvent(userId, kind === 'change' ? 'EMAIL_CHANGE_REQUESTED' : 'EMAIL_VERIFICATION_REQUESTED', null, null, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  const sent = await notice(destination, kind === 'change' ? 'Verify your new TRACE email' : 'Verify your TRACE email',
    `Open this link to verify your email address. It expires in one hour and works once:\n\n${frontendUrl()}/verify-email#token=${token}\n\nIf this was not you, ignore this email. Your existing email stays unchanged until verification.`);
  if (kind === 'change' && account.email) await notice(account.email, 'TRACE email change requested', `An email change was requested. Your current address is still active. If this was not you, secure your account at ${frontendUrl()}/forgot-password and contact the Registrar.`);
  return { message: sent?.ok ? 'Verification link sent. Check your inbox and spam folder.' : 'Verification link could not be delivered. Retry in 60 seconds, or contact the Registrar to check email delivery.', email_verification_required: true, pending_email: kind === 'change' ? destination : null, email_sent: Boolean(sent?.ok) };
}
async function confirm(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw badRequest('This verification link is invalid or expired. Request a new link.');
  const tokenHash = hash(token);
  const initial = await model.lookup(tokenHash);
  if (!initial) throw badRequest('This verification link is invalid or expired. Request a new link.');
  const connection = await pool.getConnection();
  let account, row;
  try {
    await connection.beginTransaction();
    account = await model.lockAccount(initial.user_id, connection);
    row = await model.lookup(tokenHash, connection);
    if (!account?.is_active || !row || row.user_id !== account.id || row.token_version !== account.token_version
      || (row.kind === 'signup' ? account.email?.toLowerCase() !== row.email : account.pending_email !== row.email)) throw badRequest('This verification link is invalid or expired. Request a new link.');
    const [result] = await model.consume(row.id, connection);
    if (result.affectedRows !== 1) throw badRequest('This verification link was already used.');
    await model.commitVerification(account.id, row.email, row.kind === 'change', connection);
    if (row.kind === 'change') await passwordResets.invalidateAllForUser(account.id, connection);
    await model.invalidate(account.id, 'signup', connection);
    await model.invalidate(account.id, 'change', connection);
    await users.logSecurityEvent(account.id, row.kind === 'change' ? 'EMAIL_CHANGED' : 'EMAIL_VERIFIED', null, null, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  if (row.kind === 'change') {
    require('../realtime').disconnectUser(account.id);
    await notice(account.email, 'TRACE email changed', `Your TRACE email address changed. All previous sessions ended. If this was not you, contact the Registrar immediately. ${frontendUrl()}/`);
    await notice(row.email, 'TRACE email verified', 'Your new email address is verified. Sign in again to continue.');
  }
  return { message: row.kind === 'change' ? 'Email changed and verified. Sign in again.' : 'Email verified. Return to TRACE to continue.', changed: row.kind === 'change' };
}
module.exports = { emailAddress, frontendUrl, issue, confirm };
