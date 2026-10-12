const crypto = require('crypto');
const { pool } = require('../config/db');
const env = require('../config/env');
const model = require('../models/trustedBrowser.model');
const COOKIE_NAME = 'trace_mfa_trust';

function nextManilaMidnight(now = Date.now()) {
  const day = 86400000;
  const offset = 8 * 3600000;
  return (Math.floor((now + offset) / day) + 1) * day - offset;
}

function cookieOptionsFor(frontendUrl) {
  const secure = frontendUrl.split(',').some(url => url.trim().startsWith('https://'));
  return { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: '/api/auth' };
}
const COOKIE_OPTIONS = cookieOptionsFor(env.FRONTEND_URL);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const activeStaff = user => ['clerk', 'admin'].includes(user?.role) && (user.is_active === true || user.is_active === 1);

async function isTrusted(user, cookieHeader = '', sharedComputer = true) {
  if (!activeStaff(user) || sharedComputer !== false || typeof cookieHeader !== 'string') return false;
  const cookies = cookieHeader.split(';').map(part => part.trim()).filter(part => part.startsWith(`${COOKIE_NAME}=`));
  if (cookies.length !== 1) return false;
  const value = cookies[0].slice(COOKIE_NAME.length + 1);
  if (!/^[a-f0-9]{64}$/.test(value)) return false;
  try {
    return await model.findValid({ userId: user.id, tokenHash: hash(value), tokenVersion: user.token_version ?? 0, now: Date.now() });
  } catch {
    console.warn('Browser trust unavailable; login verification is required.');
    return false;
  }
}

// Called only after successful OTP with the version and personal mode from
// the signed challenge. Never upgrade an old challenge to a newer version.
async function issue(userId, verifiedVersion) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const user = await model.lockAccount(userId, connection);
    if (!activeStaff(user) || user.token_version !== verifiedVersion
      || (user.role === 'admin' && !await model.hasActiveAuthenticator(user.id, connection))) {
      await connection.rollback();
      return null;
    }
    const value = crypto.randomBytes(32).toString('hex');
    const expiresAt = nextManilaMidnight();
    await model.create({ userId, tokenHash: hash(value), tokenVersion: verifiedVersion, expiresAt }, connection);
    await connection.commit();
    return { value, expiresAt };
  } catch {
    if (connection) {
      try { await connection.rollback(); } catch { /* Trust remains unissued. */ }
    }
    console.warn('Browser trust could not be saved; future logins require verification.');
    return null;
  } finally {
    connection?.release();
  }
}

module.exports = { isTrusted, issue, nextManilaMidnight, cookieOptionsFor, COOKIE_NAME, COOKIE_OPTIONS };
