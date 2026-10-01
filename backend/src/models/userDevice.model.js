const { pool } = require('../config/db');

/** A cookie hash recognizes a browser; it is never an authentication credential. */
async function record({ userId, deviceHash, ip, userAgent }, executor = pool) {
  const [result] = await executor.query(
    `INSERT IGNORE INTO user_devices (user_id, device_hash, ip_address, user_agent)
     VALUES (?, ?, ?, ?)`, [userId, deviceHash, ip, userAgent]
  );
  if (!result.affectedRows) {
    await executor.query(
      `UPDATE user_devices SET last_seen_at = CURRENT_TIMESTAMP, ip_address = ?, user_agent = ?
       WHERE user_id = ? AND device_hash = ?`, [ip, userAgent, userId, deviceHash]
    );
  }
  return Boolean(result.affectedRows);
}
module.exports = { record };
