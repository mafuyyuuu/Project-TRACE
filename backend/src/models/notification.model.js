const { pool } = require('../config/db');

/** Raw SQL for the in-app `notifications` table (bell icon). */

function create({ user_id, title, message, type }, executor = pool) {
  return executor.query(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
    [user_id, title, message, type]
  );
}

function findByUserId(userId, limit = 50, executor = pool) {
  return executor
    .query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit])
    .then(([rows]) => rows);
}

function markAllRead(userId, executor = pool) {
  return executor.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
}

module.exports = { create, findByUserId, markAllRead };
