const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const model = require('../models/authenticator.model');
const users = require('../models/user.model');
const notifications = require('./notification.service');
const otp = require('../utils/authenticator');
const { badRequest, unauthorized, forbidden } = require('../utils/AppError');

async function status(userId) {
  const row = await model.find(userId);
  return { enabled: Boolean(row?.active_secret), available: otp.configured(),
    recovery_codes_remaining: row?.active_secret ? await model.countCodes(userId) : 0 };
}
async function isEnabled(userId) { return Boolean((await model.find(userId))?.active_secret); }

async function transaction(userId, action, version) {
  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    const account = await model.lockAccount(userId, connection);
    if (!account || !account.is_active) throw unauthorized('Account is unavailable.');
    if (version !== undefined && account.token_version !== version) throw unauthorized('Session expired. Please log in again.');
    result = await action(account, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  // Failed verification counters must commit, rather than being rolled back.
  if (result?.error) throw result.error;
  return result;
}
function locked(row) {
  return Number(row?.locked_until_ms) > Date.now();
}
async function failed(userId, row, connection) {
  const attempts = row?.locked_until_ms && !locked(row) ? 1 : Number(row?.failed_attempts || 0) + 1;
  if (row) await model.failure(userId, attempts, attempts >= 5 ? Date.now() + 15 * 60000 : null, connection);
  return { error: badRequest(attempts >= 5 ? 'Too many verification attempts. Try again in 15 minutes.' : 'Invalid verification code. Try again.') };
}
async function password(account, value) {
  return typeof value === 'string' && await bcrypt.compare(value, account.password_hash);
}
async function verifyFactor(account, row, body, connection) {
  if (!row?.active_secret || locked(row)) return false;
  if (body.recovery_code) {
    const hash = otp.recoveryHash(body.recovery_code);
    const accepted = Boolean(hash && await model.consumeCode(account.id, hash, connection));
    if (accepted) await model.clearFailures(account.id, connection);
    return accepted;
  }
  const counter = otp.verifyCode(otp.decrypt(row.active_secret, account.id), body.code, row.last_counter);
  if (counter === null) return false;
  await model.acceptCounter(account.id, counter, connection);
  return true;
}
async function begin(user, body) {
  // Validate server key before creating a secret that could never be decrypted.
  if (!otp.configured()) otp.encrypt('', user.id);
  return transaction(user.id, async (account, connection) => {
    const row = await model.find(account.id, connection);
    if (locked(row)) return { error: badRequest('Too many verification attempts. Try again later.') };
    if (!await password(account, body.current_password)) return { error: badRequest('Current password is incorrect.') };
    if (row?.active_secret) throw badRequest('An authenticator is already enabled. Disable it before replacing it.');
    const secret = otp.newSecret();
    await model.savePending(account.id, otp.encrypt(secret, account.id), Date.now() + 10 * 60000, account.token_version, connection);
    return { secret, provisioning_uri: otp.provisioningUri(secret, account.student_id), expires_in: 600 };
  }, user.token_version);
}
async function refreshedSession(account, connection) {
  await users.incrementTokenVersion(account.id, connection);
  await users.clearEmailOTP(account.id, connection);
  await model.revokeChallenges(account.id, connection);
  const [profile] = await users.getProfileById(account.id, connection);
  return require('./auth.service').createSession({ ...account, ...profile, token_version: account.token_version + 1 });
}
async function notifyChanged(userId, event) {
  try {
    const [user] = await users.findById(userId);
    if (user?.email) await notifications.sendEmail(user.email, 'TRACE two-factor authentication changed',
      `Your authenticator settings were changed: ${event}. If this was not you, contact the registrar administrator immediately.`);
  } catch { console.warn('Authenticator change notification unavailable.'); }
}
async function confirm(user, body) {
  const result = await transaction(user.id, async (account, connection) => {
    const row = await model.find(account.id, connection);
    if (locked(row)) return { error: badRequest('Too many verification attempts. Try again later.') };
    if (!await password(account, body.current_password)) return { error: badRequest('Current password is incorrect.') };
    if (row?.active_secret) throw badRequest('An authenticator is already enabled.');
    if (!row?.pending_secret || Number(row.pending_expires_ms) <= Date.now() || row.pending_version !== account.token_version) {
      throw badRequest('Authenticator setup expired. Start setup again.');
    }
    const counter = otp.verifyCode(otp.decrypt(row.pending_secret, account.id), body.code);
    if (counter === null) return failed(account.id, row, connection);
    const codes = otp.recoveryCodes();
    await model.activate(account.id, counter, connection);
    await model.replaceCodes(account.id, codes.map(otp.recoveryHash), connection);
    await users.logSecurityEvent(account.id, 'AUTHENTICATOR_ENABLED', null, null, connection);
    return { ...await refreshedSession(account, connection), recovery_codes: codes, enabled: true };
  }, user.token_version);
  require('../realtime').disconnectUser(user.id);
  await notifyChanged(user.id, 'enabled');
  return result;
}
async function change(user, body, action) {
  const result = await transaction(user.id, async (account, connection) => {
    const row = await model.find(account.id, connection);
    if (locked(row)) return { error: badRequest('Too many verification attempts. Try again later.') };
    if (!await password(account, body.current_password)) return { error: badRequest('Current password is incorrect.') };
    if (!row?.active_secret) throw badRequest('No authenticator is enabled.');
    if (!await verifyFactor(account, row, body, connection)) return failed(account.id, row, connection);
    let codes;
    if (action === 'disable') {
      await model.disable(account.id, connection);
      await model.replaceCodes(account.id, [], connection);
    } else {
      codes = otp.recoveryCodes();
      await model.replaceCodes(account.id, codes.map(otp.recoveryHash), connection);
    }
    await users.logSecurityEvent(account.id, action === 'disable' ? 'AUTHENTICATOR_DISABLED' : 'RECOVERY_CODES_REGENERATED', null, null, connection);
    return { ...await refreshedSession(account, connection), enabled: action !== 'disable', ...(codes ? { recovery_codes: codes } : {}) };
  }, user.token_version);
  require('../realtime').disconnectUser(user.id);
  await notifyChanged(user.id, action === 'disable' ? 'disabled' : 'recovery codes regenerated');
  return result;
}
async function challenge(user, canTrustBrowser) {
  return transaction(user.id, async (account, connection) => {
    const row = await model.find(account.id, connection);
    if (!row?.active_secret) throw unauthorized('Authenticator changed. Please log in again.');
    if (!otp.configured()) otp.decrypt(row.active_secret, account.id);
    if (locked(row)) throw badRequest('Too many verification attempts. Try again later.');
    const nonce = crypto.randomBytes(32).toString('hex');
    await model.createChallenge({ hash: otp.hash(nonce), userId: account.id, version: account.token_version, expires: Date.now() + 5 * 60000 }, connection);
    const token = jwt.sign({ id: account.id, pending_2fa: true, token_version: account.token_version,
      mfa_method: 'authenticator', nonce, can_trust_browser: canTrustBrowser === true }, env.JWT_SECRET, { expiresIn: '5m' });
    return { requires_2fa: true, mfa_method: 'authenticator', temp_token: token, can_trust_browser: canTrustBrowser === true };
  }, user.token_version ?? 0);
}
async function verifyChallenge(decoded, body) {
  return transaction(decoded.id, async (account, connection) => {
    const row = await model.find(account.id, connection);
    const hash = typeof decoded.nonce === 'string' && /^[a-f0-9]{64}$/.test(decoded.nonce) ? otp.hash(decoded.nonce) : '';
    const pending = await model.findChallenge(hash, connection);
    if (!pending || pending.user_id !== account.id || pending.token_version !== account.token_version
      || pending.method !== 'authenticator' || pending.consumed || Number(pending.expires_at_ms) <= Date.now() || pending.attempts >= 5) {
      throw unauthorized('Login verification expired. Please log in again.');
    }
    if (account.role === 'student' && account.verification_status !== 'verified') throw forbidden(`Account is ${account.verification_status}.`);
    if (locked(row)) throw badRequest('Too many verification attempts. Try again later.');
    if (!await verifyFactor(account, row, body, connection)) {
      await model.updateChallenge(hash, pending.attempts + 1, false, connection);
      return failed(account.id, row, connection);
    }
    await model.updateChallenge(hash, pending.attempts, true, connection);
    await users.resetLoginSecurity(account.id, connection);
    await users.logSecurityEvent(account.id, body.recovery_code ? 'LOGIN_RECOVERY_CODE' : 'LOGIN_AUTHENTICATOR', null, null, connection);
    const [profile] = await users.getProfileById(account.id, connection);
    return { ...account, ...profile, token_version: account.token_version };
  }, decoded.token_version);
}
module.exports = { status, isEnabled, begin, confirm, change, challenge, verifyChallenge, refreshedSession, notifyChanged };
