const { pool } = require('../config/db');
async function lockStudent(id, executor = pool) {
  const [rows] = await executor.query('SELECT id, role, is_active FROM users WHERE id = ? FOR UPDATE', [id]);
  return rows[0];
}
function insert(studentId, senderId, message, executor = pool) {
  return executor.query('INSERT INTO support_messages (student_user_id, sender_id, message) VALUES (?, ?, ?)', [studentId, senderId, message]);
}
async function messages(studentId, executor = pool) {
  const [rows] = await executor.query(`SELECT m.*, u.full_name AS sender_name, u.role AS sender_role FROM support_messages m
    JOIN users u ON u.id = m.sender_id WHERE m.student_user_id = ?
    AND m.id IN (SELECT recent.id FROM (SELECT id FROM support_messages WHERE student_user_id = ? ORDER BY id DESC LIMIT 100) recent)
    ORDER BY m.id ASC`, [studentId, studentId]);
  return rows;
}
function markRead(studentId, studentSide, throughId, executor = pool) {
  return executor.query(`UPDATE support_messages SET read_at = CURRENT_TIMESTAMP
    WHERE student_user_id = ? AND id <= ? AND read_at IS NULL AND sender_id ${studentSide ? '<>' : '='} ?`, [studentId, throughId, studentId]);
}
async function threads(studentId, page, executor = pool) {
  const filter = studentId ? 'u.id = ?' : 'EXISTS(SELECT 1 FROM support_messages any_message WHERE any_message.student_user_id = u.id)';
  const params = studentId ? [studentId] : [];
  const where = `u.role = 'student' AND u.is_active = 1 AND ${filter}`;
  const [count] = await executor.query(`SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params);
  const [rows] = await executor.query(`SELECT u.id, u.full_name, u.student_id,
    (SELECT MAX(created_at) FROM support_messages m WHERE m.student_user_id = u.id) AS last_message_at,
    (SELECT COUNT(*) FROM support_messages m WHERE m.student_user_id = u.id AND m.read_at IS NULL
      AND m.sender_id ${studentId ? '<>' : '='} u.id) AS unread_count
    FROM users u WHERE ${where} ORDER BY last_message_at DESC, u.id DESC LIMIT 20 OFFSET ?`, [...params, (page - 1) * 20]);
  return { threads: rows, total: Number(count[0]?.total || 0) };
}
module.exports = { lockStudent, insert, messages, markRead, threads };
