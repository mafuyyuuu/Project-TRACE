const { pool } = require('../config/db');

function insert(documentId, senderId, message, executor = pool) {
  return executor.query(
    'INSERT INTO document_messages (document_id, sender_id, message) VALUES (?, ?, ?)',
    [documentId, senderId, message]
  );
}

function findByDocumentId(documentId, executor = pool) {
  return executor
    .query(`
      SELECT m.*, u.full_name as sender_name, u.role as sender_role 
      FROM document_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.document_id = ?
      AND m.id IN (SELECT recent.id FROM (SELECT id FROM document_messages WHERE document_id = ? ORDER BY id DESC LIMIT 100) recent)
      ORDER BY m.id ASC
    `, [documentId, documentId])
    .then(([rows]) => rows);
}

function markAsRead(documentId, side, executor = pool) {
  // Shared Window 1 acknowledgment; another staff desk must not clear its unread queue.
  return executor.query(
    `UPDATE document_messages m JOIN users sender ON sender.id = m.sender_id
     SET m.read_at = CURRENT_TIMESTAMP WHERE m.document_id = ? AND m.read_at IS NULL
     AND ${side === 'student' ? "sender.role IN ('clerk', 'admin')" : "sender.role = 'student'"}`,
    [documentId]
  );
}

function window1Recipients(executor = pool) {
  return executor.query(`SELECT id FROM users WHERE is_active = 1 AND role = 'clerk'
    AND desk_assignment IN ('Window 1', 'Receiving Desk')`).then(([rows]) => rows);
}

function threadList(conditions, params, page, limit, side, executor = pool) {
  const where = conditions.length ? conditions.join(' AND ') : '1 = 1';
  const unread = side === 'student' ? "sender.role IN ('clerk', 'admin')" : "sender.role = 'student'";
  return executor.query(`SELECT d.id, d.tracking_number, d.document_type, d.student_name, d.current_status,
    (SELECT MAX(m.created_at) FROM document_messages m WHERE m.document_id = d.id) AS last_message_at,
    (SELECT COUNT(*) FROM document_messages m JOIN users sender ON sender.id = m.sender_id
      WHERE m.document_id = d.id AND m.read_at IS NULL AND ${unread}) AS unread_count
    FROM documents d JOIN users student ON student.student_id = d.student_id AND student.role = 'student'
    WHERE ${where} ORDER BY COALESCE(last_message_at, d.created_at) DESC, d.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]).then(([rows]) => rows);
}

function countThreads(conditions, params, executor = pool) {
  return executor.query(`SELECT COUNT(*) AS total FROM documents d
    JOIN users student ON student.student_id = d.student_id AND student.role = 'student'
    WHERE ${conditions.length ? conditions.join(' AND ') : '1 = 1'}`, params).then(([rows]) => Number(rows[0]?.total || 0));
}

module.exports = {
  insert,
  findByDocumentId,
  markAsRead,
  window1Recipients,
  threadList,
  countThreads,
};
