const { pool } = require('../config/db');
async function save(userId, hash, issuer, version, expires, executor = pool) {
  return executor.query(`INSERT INTO staff_authenticator_setup (user_id, code_hash, issued_by, token_version, expires_at_ms)
    VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), issued_by = VALUES(issued_by),
    token_version = VALUES(token_version), expires_at_ms = VALUES(expires_at_ms), attempts = 0, consumed = FALSE, created_at = CURRENT_TIMESTAMP`,
  [userId, hash, issuer, version, expires]);
}
async function find(userId, executor = pool) {
  const [rows] = await executor.query('SELECT * FROM staff_authenticator_setup WHERE user_id = ? FOR UPDATE', [userId]);
  return rows[0];
}
function failed(userId, executor = pool) {
  return executor.query('UPDATE staff_authenticator_setup SET attempts = attempts + 1 WHERE user_id = ?', [userId]);
}
function consume(userId, executor = pool) {
  return executor.query('UPDATE staff_authenticator_setup SET consumed = TRUE WHERE user_id = ?', [userId]);
}
module.exports = { save, find, failed, consume };
