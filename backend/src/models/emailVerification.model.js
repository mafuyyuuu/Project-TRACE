const { pool } = require('../config/db');

async function lockAccount(id, executor = pool) {
  const [rows] = await executor.query('SELECT id, role, email, pending_email, email_verified_at, password_hash, token_version, is_active FROM users WHERE id = ? FOR UPDATE', [id]);
  return rows[0];
}
async function recentlySent(id, kind, executor = pool) {
  const [rows] = await executor.query('SELECT id FROM email_verifications WHERE user_id = ? AND kind = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND) LIMIT 1', [id, kind]);
  return rows.length > 0;
}
function invalidate(id, kind, executor = pool) {
  return executor.query('UPDATE email_verifications SET used_at = NOW() WHERE user_id = ? AND kind = ? AND used_at IS NULL', [id, kind]);
}
function create(id, kind, email, hash, version, executor = pool) {
  return executor.query('INSERT INTO email_verifications (user_id, kind, email, token_hash, token_version, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [id, kind, email, hash, version]);
}
async function lookup(hash, executor = pool) {
  const [rows] = await executor.query('SELECT * FROM email_verifications WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()', [hash]);
  return rows[0];
}
function consume(id, executor = pool) {
  return executor.query('UPDATE email_verifications SET used_at = NOW() WHERE id = ? AND used_at IS NULL AND expires_at > NOW()', [id]);
}
function commitVerification(userId, email, change, executor = pool) {
  return executor.query(`UPDATE users SET email = ?, email_verified_at = NOW()${change ? ', pending_email = NULL, email_otp = NULL, email_otp_expires = NULL, token_version = token_version + 1, login_otp = NULL, login_otp_expires = NULL' : ''} WHERE id = ?`, [email, userId]);
}
module.exports = { lockAccount, recentlySent, invalidate, create, lookup, consume, commitVerification };
