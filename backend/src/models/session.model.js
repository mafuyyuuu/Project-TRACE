const pool = require('../../database/connection');

function findSession(userId, fingerprint, ipAddress, userAgent, executor = pool) {
  // Try finding by exact fingerprint OR (ip + user_agent fallback)
  return executor
    .query(
      'SELECT id FROM sessions WHERE user_id = ? AND (device_fingerprint = ? OR (ip_address = ? AND user_agent = ?)) LIMIT 1',
      [userId, fingerprint || 'unknown', ipAddress, userAgent]
    )
    .then(([rows]) => rows[0]);
}

function createSession(userId, fingerprint, ipAddress, userAgent, executor = pool) {
  return executor
    .query(
      'INSERT INTO sessions (user_id, device_fingerprint, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [userId, fingerprint || 'unknown', ipAddress, userAgent]
    )
    .then(([result]) => result.insertId);
}

module.exports = {
  findSession,
  createSession,
};
