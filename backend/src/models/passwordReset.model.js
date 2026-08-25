const { pool } = require('../config/db');

/**
 * All raw SQL for the `password_resets` table. Every function accepts an
 * optional `executor` (a pool or an in-flight transaction connection), matching
 * the rest of the model layer.
 *
 * Only the SHA-256 hash of a token is ever stored or queried — the raw token
 * exists solely in the email that was sent.
 */

function create({ user_id, token_hash, expires_at }, executor = pool) {
  return executor.query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user_id, token_hash, expires_at]
  );
}

/**
 * Look up a token that is still usable: not consumed, and not past its expiry.
 * The expiry is compared in SQL so a wrong clock on the app server cannot
 * silently extend a token's life.
 */
function findUsableByTokenHash(tokenHash, executor = pool) {
  return executor
    .query(
      `SELECT pr.id, pr.user_id, u.student_id, u.full_name, u.email
         FROM password_resets pr
         JOIN users u ON u.id = pr.user_id
        WHERE pr.token_hash = ?
          AND pr.used_at IS NULL
          AND pr.expires_at > NOW()`,
      [tokenHash]
    )
    .then(([rows]) => rows);
}

function markUsed(id, executor = pool) {
  return executor.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [id]);
}

/**
 * Consume every other outstanding token for a user. Called after a successful
 * reset so an older link sitting in an inbox cannot be used to take the account
 * back, and when issuing a new one so only the newest link works.
 */
function invalidateAllForUser(userId, executor = pool) {
  return executor.query(
    'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
}

module.exports = { create, findUsableByTokenHash, markUsed, invalidateAllForUser };
