const { pool } = require('../config/db');

/**
 * Raw SQL for the `step_logs` audit trail. This table is append-only in normal
 * operation — the only delete is the student-cancellation cleanup.
 */

function insert(data, executor = pool) {
  const { document_id, clerk_id = null, action_taken, from_status = null, to_status, notes } = data;
  return executor.query(
    `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [document_id, clerk_id, action_taken, from_status, to_status, notes]
  );
}

function findByDocumentId(documentId, executor = pool) {
  return executor
    .query(
      `SELECT sl.id, sl.action_taken, sl.from_status, sl.to_status,
              sl.timestamp_started, sl.timestamp_completed, sl.notes,
              u.full_name AS clerk_name, u.desk_assignment
       FROM step_logs sl
       LEFT JOIN users u ON sl.clerk_id = u.id
       WHERE sl.document_id = ?
       ORDER BY sl.timestamp_started ASC`,
      [documentId]
    )
    .then(([rows]) => rows);
}

function listActivityLogs(limit = 100, executor = pool) {
  return executor
    .query(
      `SELECT sl.id, sl.action_taken as step_name, sl.to_status as status, sl.notes, sl.timestamp_started, sl.timestamp_completed,
              d.tracking_number, d.document_type, u.full_name as user_name
       FROM step_logs sl
       JOIN documents d ON sl.document_id = d.id
       LEFT JOIN users u ON sl.clerk_id = u.id
       ORDER BY sl.timestamp_started DESC
       LIMIT ?`,
      [limit]
    )
    .then(([rows]) => rows);
}

function deleteByDocumentId(documentId, executor = pool) {
  return executor.query('DELETE FROM step_logs WHERE document_id = ?', [documentId]);
}

module.exports = { insert, findByDocumentId, listActivityLogs, deleteByDocumentId };
