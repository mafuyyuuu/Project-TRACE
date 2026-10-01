const { pool } = require('../config/db');
async function find(userId, executor = pool) {
  const [rows] = await executor.query('SELECT * FROM authenticator_credentials WHERE user_id = ?', [userId]);
  return rows[0];
}
async function lockAccount(userId, executor = pool) {
  const [rows] = await executor.query('SELECT id, student_id, full_name, role, desk_assignment, user_type, course, email, verification_status, is_active, password_hash, token_version FROM users WHERE id = ? FOR UPDATE', [userId]);
  return rows[0];
}
function savePending(userId, secret, expires, version, executor = pool) {
  return executor.query(`INSERT INTO authenticator_credentials (user_id, pending_secret, pending_expires_ms, pending_version)
    VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE pending_secret = VALUES(pending_secret), pending_expires_ms = VALUES(pending_expires_ms), pending_version = VALUES(pending_version)`, [userId, secret, expires, version]);
}
function activate(userId, counter, executor = pool) {
  return executor.query(`UPDATE authenticator_credentials SET active_secret = pending_secret, pending_secret = NULL,
    pending_expires_ms = NULL, pending_version = NULL, last_counter = ?, failed_attempts = 0, locked_until_ms = NULL WHERE user_id = ?`, [counter, userId]);
}
function disable(userId, executor = pool) {
  return executor.query('DELETE FROM authenticator_credentials WHERE user_id = ?', [userId]);
}
function acceptCounter(userId, counter, executor = pool) {
  return executor.query('UPDATE authenticator_credentials SET last_counter = ?, failed_attempts = 0, locked_until_ms = NULL WHERE user_id = ?', [counter, userId]);
}
function failure(userId, attempts, until, executor = pool) {
  return executor.query('UPDATE authenticator_credentials SET failed_attempts = ?, locked_until_ms = ? WHERE user_id = ?', [attempts, until, userId]);
}
function clearFailures(userId, executor = pool) {
  return executor.query('UPDATE authenticator_credentials SET failed_attempts = 0, locked_until_ms = NULL WHERE user_id = ?', [userId]);
}
async function replaceCodes(userId, hashes, executor = pool) {
  await executor.query('DELETE FROM authenticator_recovery_codes WHERE user_id = ?', [userId]);
  for (const hash of hashes) await executor.query('INSERT INTO authenticator_recovery_codes (code_hash, user_id) VALUES (?, ?)', [hash, userId]);
}
async function consumeCode(userId, hash, executor = pool) {
  const [result] = await executor.query('UPDATE authenticator_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND code_hash = ? AND used_at IS NULL', [userId, hash]);
  return result.affectedRows === 1;
}
async function countCodes(userId, executor = pool) {
  const [rows] = await executor.query('SELECT COUNT(*) AS remaining FROM authenticator_recovery_codes WHERE user_id = ? AND used_at IS NULL', [userId]);
  return Number(rows[0]?.remaining || 0);
}
async function createChallenge(data, executor = pool) {
  await executor.query('DELETE FROM authenticator_challenges WHERE user_id = ?', [data.userId]);
  return executor.query('INSERT INTO authenticator_challenges (nonce_hash, user_id, token_version, method, expires_at_ms) VALUES (?, ?, ?, ?, ?)', [data.hash, data.userId, data.version, 'authenticator', data.expires]);
}
async function findChallenge(hash, executor = pool) {
  const [rows] = await executor.query('SELECT * FROM authenticator_challenges WHERE nonce_hash = ? FOR UPDATE', [hash]);
  return rows[0];
}
function updateChallenge(hash, attempts, consumed, executor = pool) {
  return executor.query('UPDATE authenticator_challenges SET attempts = ?, consumed = ? WHERE nonce_hash = ?', [attempts, consumed, hash]);
}
function revokeChallenges(userId, executor = pool) {
  return executor.query('DELETE FROM authenticator_challenges WHERE user_id = ?', [userId]);
}
module.exports = { find, lockAccount, savePending, activate, disable, acceptCounter, failure, clearFailures, replaceCodes, consumeCode, countCodes, createChallenge, findChallenge, updateChallenge, revokeChallenges };
