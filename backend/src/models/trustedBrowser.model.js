const { pool } = require('../config/db');

async function findValid({ userId, tokenHash, tokenVersion, now }, executor = pool) {
  const [rows] = await executor.query(`SELECT t.user_id FROM trusted_browsers t
    JOIN users u ON u.id = t.user_id
    WHERE t.user_id = ? AND t.token_hash = ? AND t.token_version = ?
      AND t.token_version = u.token_version AND t.expires_at_ms > ?
      AND (u.role = 'clerk' OR (u.role = 'admin' AND EXISTS (
        SELECT 1 FROM authenticator_credentials a WHERE a.user_id = u.id AND a.active_secret IS NOT NULL
      ))) AND u.is_active = TRUE`, [userId, tokenHash, tokenVersion, now]);
  return rows.length > 0;
}

function create({ userId, tokenHash, tokenVersion, expiresAt }, executor = pool) {
  return executor.query(`INSERT INTO trusted_browsers (token_hash, user_id, token_version, expires_at_ms)
    VALUES (?, ?, ?, ?)`, [tokenHash, userId, tokenVersion, expiresAt]);
}
async function hasActiveAuthenticator(userId, executor = pool) {
  const [rows] = await executor.query('SELECT user_id FROM authenticator_credentials WHERE user_id = ? AND active_secret IS NOT NULL', [userId]);
  return rows.length > 0;
}

// Serialize grants and credential changes against the existing version bump.
async function lockAccount(userId, executor = pool) {
  const [rows] = await executor.query(`SELECT id, role, is_active, token_version, password_hash, email, full_name, student_id
    FROM users WHERE id = ? FOR UPDATE`, [userId]);
  return rows[0];
}

module.exports = { findValid, create, lockAccount, hasActiveAuthenticator };
