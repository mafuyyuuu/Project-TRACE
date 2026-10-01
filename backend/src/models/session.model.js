const crypto = require('crypto');
const { pool } = require('../config/db');
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
function revoke(userId, hash, expires, executor = pool) {
  return executor.query(`INSERT INTO session_revocations (user_id, token_hash, expires_at)
    VALUES (?, ?, FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`, [userId, hash, expires]);
}
async function revoked(hash, executor = pool) {
  const [rows] = await executor.query('SELECT token_hash FROM session_revocations WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP', [hash]);
  return rows.length > 0;
}
module.exports = { hashToken, revoke, revoked };
