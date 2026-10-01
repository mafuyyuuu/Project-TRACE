const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const model = require('../models/staffAuthenticatorSetup.model');
const factors = require('../models/authenticator.model');
const users = require('../models/user.model');
const otp = require('../utils/authenticator');
const { badRequest, forbidden } = require('../utils/AppError');
const invalid = () => badRequest('Setup could not be verified. Check your staff ID, password and Admin setup code, or ask Admin for a fresh code.');
async function transaction(action) {
  const connection = await pool.getConnection();
  let result;
  try { await connection.beginTransaction(); result = await action(connection); await connection.commit(); }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  if (result?.error) throw result.error;
  return result;
}
async function issue(viewer, userId, body) {
  if (viewer.role !== 'admin') throw forbidden('Only Admin may issue staff setup codes.');
  if (!Number.isInteger(userId) || userId <= 0 || userId === viewer.id) throw badRequest('Choose an active clerk account.');
  if (!otp.configured()) otp.encrypt('', userId);
  return transaction(async connection => {
    const accounts = {};
    for (const id of [viewer.id, userId].sort((a, b) => a - b)) accounts[id] = await factors.lockAccount(id, connection);
    const admin = accounts[viewer.id], staff = accounts[userId];
    if (!admin?.is_active || admin.role !== 'admin' || admin.token_version !== viewer.token_version) throw forbidden('Admin session changed. Sign in again.');
    if (typeof body?.current_password !== 'string' || !await bcrypt.compare(body.current_password, admin.password_hash)) throw badRequest('Current password is incorrect.');
    if (!staff?.is_active || staff.role !== 'clerk') throw badRequest('Choose an active clerk account.');
    if ((await factors.find(userId, connection))?.active_secret) throw badRequest('This account already has an authenticator. Initial setup cannot replace it.');
    const code = crypto.randomBytes(32).toString('hex'), expires = Date.now() + 10 * 60000;
    await factors.clearPending(userId, connection);
    await model.save(userId, otp.hash(code), viewer.id, staff.token_version, expires, connection);
    await users.logSecurityEvent(viewer.id, `STAFF_AUTHENTICATOR_SETUP_ISSUED:${userId}`, null, null, connection);
    return { setup_code: code, expires_at: new Date(expires).toISOString(), staff_id: staff.student_id };
  });
}
async function enroll(body, confirm = false) {
  if (!otp.configured()) otp.encrypt('', 0);
  if (typeof body?.employee_id !== 'string' || typeof body.password !== 'string' || typeof body.setup_code !== 'string'
    || body.employee_id.length > 50 || body.password.length > 64 || !/^[a-f0-9]{64}$/i.test(body.setup_code)) throw invalid();
  const rows = await users.findActiveByStudentId(body.employee_id.trim());
  const candidate = rows[0];
  if (!candidate) throw invalid();
  const result = await transaction(async connection => {
    const account = await factors.lockAccount(candidate.id, connection);
    const grant = await model.find(candidate.id, connection);
    if (!account?.is_active || account.role !== 'clerk' || !grant || grant.consumed || grant.attempts >= 5
      || grant.token_version !== account.token_version || Number(grant.expires_at_ms) <= Date.now()) throw invalid();
    const expected = Buffer.from(grant.code_hash, 'hex'), actual = Buffer.from(otp.hash(body.setup_code.toLowerCase()), 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual) || !await bcrypt.compare(body.password, account.password_hash)) {
      await model.failed(account.id, connection); return { error: invalid() };
    }
    const row = await factors.find(account.id, connection);
    if (row?.active_secret) throw invalid();
    if (Number(row?.locked_until_ms) > Date.now()) throw invalid();
    if (!confirm) {
      const secret = otp.newSecret();
      await factors.savePending(account.id, otp.encrypt(secret, account.id), Number(grant.expires_at_ms), account.token_version, connection);
      return { secret, provisioning_uri: otp.provisioningUri(secret, account.student_id), expires_at: new Date(Number(grant.expires_at_ms)).toISOString() };
    }
    if (!row?.pending_secret || row.pending_version !== account.token_version || Number(row.pending_expires_ms) <= Date.now()) throw invalid();
    const counter = otp.verifyCode(otp.decrypt(row.pending_secret, account.id), body.code);
    if (counter === null) { await model.failed(account.id, connection); return { error: invalid() }; }
    const codes = otp.recoveryCodes();
    await factors.activate(account.id, counter, connection);
    await factors.replaceCodes(account.id, codes.map(otp.recoveryHash), connection);
    await model.consume(account.id, connection);
    await users.logSecurityEvent(account.id, 'STAFF_AUTHENTICATOR_ENROLLED', null, null, connection);
    await users.resetLoginSecurity(account.id, connection);
    return { ...await require('./authenticator.service').refreshedSession(account, connection), recovery_codes: codes, enabled: true };
  });
  if (confirm) {
    require('../realtime').disconnectUser(candidate.id);
    await require('./authenticator.service').notifyChanged(candidate.id, 'enabled with Admin-assisted initial setup');
  }
  return result;
}
module.exports = { issue, start: body => enroll(body), confirm: body => enroll(body, true) };
