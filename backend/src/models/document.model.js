const { pool } = require('../config/db');

/**
 * All raw SQL for the `documents` table. Every function accepts an optional
 * `executor` (pool or in-flight transaction connection); defaults to the pool.
 */

function insert(data, executor = pool) {
  const {
    tracking_number, request_group_id, student_id, student_name, document_type,
    current_status, payment_status, assigned_clerk_id, file_path, original_filename,
    checkout_url, purpose, copies, amount,
  } = data;
  return executor.query(
    `INSERT INTO documents (tracking_number, request_group_id, student_id, student_name, document_type,
      current_status, payment_status, assigned_clerk_id, file_path, original_filename, checkout_url, purpose, copies, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tracking_number, request_group_id || tracking_number,
      student_id || null, student_name || null, document_type || null,
      current_status, payment_status, assigned_clerk_id, file_path, original_filename,
      checkout_url, purpose || null, copies, amount,
    ]
  );
}

function findById(documentId, executor = pool) {
  return executor
    .query('SELECT * FROM documents WHERE id = ?', [documentId])
    .then(([rows]) => rows);
}

/** Row-locking read — must be called inside a transaction. */
function findByIdForUpdate(documentId, executor) {
  return executor
    .query('SELECT * FROM documents WHERE id = ? FOR UPDATE', [documentId])
    .then(([rows]) => rows);
}

function findByTrackingNumber(trackingNumber, executor = pool) {
  return executor
    .query('SELECT * FROM documents WHERE tracking_number = ?', [trackingNumber])
    .then(([rows]) => rows);
}

/**
 * Shared WHERE-clause builder for the paginated list + its count query, so
 * both always filter identically.
 */
function listWithFilters(conditions, params, limit, offset, executor = pool) {
  let query = 'SELECT * FROM documents';
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  return executor.query(query, [...params, limit, offset]).then(([rows]) => rows);
}

function countWithFilters(conditions, params, executor = pool) {
  let countQuery = 'SELECT COUNT(*) as total FROM documents';
  if (conditions.length > 0) countQuery += ' WHERE ' + conditions.join(' AND ');
  return executor.query(countQuery, params).then(([rows]) => rows[0].total);
}

function updateOcrData(documentId, ocr, executor = pool) {
  return executor.query(
    `UPDATE documents SET
      ocr_raw_text = ?,
      ocr_extracted_data = ?,
      ocr_confidence_score = ?,
      student_id = COALESCE(?, student_id),
      document_type = COALESCE(?, document_type)
     WHERE id = ?`,
    [ocr.raw_text, ocr.extracted_data_json, ocr.confidence, ocr.student_id, ocr.form_type, documentId]
  );
}

function updateAssignedClerk(documentId, clerkId, executor = pool) {
  return executor.query('UPDATE documents SET assigned_clerk_id = ? WHERE id = ?', [clerkId, documentId]);
}

function updateStatusClearingClerk(documentId, newStatus, executor = pool) {
  return executor.query(
    'UPDATE documents SET current_status = ?, assigned_clerk_id = NULL WHERE id = ?',
    [newStatus, documentId]
  );
}

function updatePaymentSubmission(documentId, gcashReferenceNo, receiptPath, executor = pool) {
  return executor.query(
    `UPDATE documents
     SET current_status = "pending_payment_verification",
         gcash_reference_no = ?,
         receipt_image_path = ?
     WHERE id = ?`,
    [gcashReferenceNo, receiptPath, documentId]
  );
}

function updatePaymentVerification(documentId, newStatus, paymentStatus, officialReceiptPath, executor = pool) {
  if (officialReceiptPath) {
    return executor.query(
      'UPDATE documents SET current_status = ?, payment_status = ?, official_receipt_path = ? WHERE id = ?',
      [newStatus, paymentStatus, officialReceiptPath, documentId]
    );
  }
  return executor.query(
    'UPDATE documents SET current_status = ?, payment_status = ? WHERE id = ?',
    [newStatus, paymentStatus, documentId]
  );
}

function updateEvaluation(documentId, newStatus, studentId, studentName, documentType, executor = pool) {
  return executor.query(
    `UPDATE documents SET
      current_status = ?,
      student_id = COALESCE(?, student_id),
      student_name = COALESCE(?, student_name),
      document_type = COALESCE(?, document_type)
     WHERE id = ?`,
    [newStatus, studentId, studentName, documentType, documentId]
  );
}

function markCompleted(documentId, executor = pool) {
  return executor.query('UPDATE documents SET current_status = "completed" WHERE id = ?', [documentId]);
}

function markPaidByTrackingNumber(trackingNumber, executor = pool) {
  return executor.query(
    'UPDATE documents SET payment_status = "PAID", current_status = "submitted" WHERE tracking_number = ? AND payment_status = "UNPAID"',
    [trackingNumber]
  );
}

function deleteById(documentId, executor = pool) {
  return executor.query('DELETE FROM documents WHERE id = ?', [documentId]);
}

// ---------------------------------------------------------------------------
// Dashboard stats / forecast / insights reads
// ---------------------------------------------------------------------------

function countProcessedTodayByClerk(userId, executor = pool) {
  return executor
    .query(
      `SELECT COUNT(DISTINCT sl.document_id) as count
       FROM step_logs sl
       WHERE sl.clerk_id = ? AND DATE(sl.timestamp_started) = CURDATE()`,
      [userId]
    )
    .then(([rows]) => rows[0].count || 0);
}

function countClearedBySecretaryToday(executor = pool) {
  return executor
    .query(
      `SELECT COUNT(*) as count FROM step_logs
       WHERE action_taken = 'secretary_approved' AND DATE(timestamp_started) = CURDATE()`
    )
    .then(([rows]) => rows[0].count || 0);
}

function avgProcessingMinutes(executor = pool) {
  return executor
    .query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE,
        (SELECT MIN(sl2.timestamp_started) FROM step_logs sl2 WHERE sl2.document_id = d.id),
        (SELECT MAX(sl3.timestamp_started) FROM step_logs sl3 WHERE sl3.document_id = d.id)
       )) as avg_minutes
       FROM documents d WHERE d.current_status IN ('completed', 'released')`
    )
    .then(([rows]) => parseFloat(rows[0].avg_minutes) || 0);
}

function avgOcrConfidence(executor = pool) {
  return executor
    .query('SELECT AVG(ocr_confidence_score) as avg_confidence FROM documents WHERE ocr_confidence_score IS NOT NULL')
    .then(([rows]) => parseFloat(rows[0].avg_confidence) || 0);
}

function countBacklog(executor = pool) {
  return executor
    .query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status IN ('pending_payment', 'pending_payment_verification', 'pending_secretary', 'ready_window_1')`
    )
    .then(([rows]) => rows[0].count || 0);
}

function countByStatus(status, executor = pool) {
  return executor
    .query('SELECT COUNT(*) as count FROM documents WHERE current_status = ?', [status])
    .then(([rows]) => rows[0].count || 0);
}

function countCompletedToday(executor = pool) {
  return executor
    .query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status IN ('completed', 'released') AND DATE(updated_at) = CURDATE()`
    )
    .then(([rows]) => rows[0].count || 0);
}

/** Historical daily volumes used by the local forecast fallback. */
function forecastFallbackRows(executor = pool) {
  return executor
    .query(
      `SELECT DATE(timestamp_started) as date, COUNT(*) as volume
       FROM step_logs
       WHERE timestamp_started >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(timestamp_started)
       ORDER BY date DESC LIMIT 7`
    )
    .then(([rows]) => rows);
}

function countStepLogsToday(executor = pool) {
  return executor
    .query('SELECT COUNT(*) as count FROM step_logs WHERE DATE(timestamp_started) = CURDATE()')
    .then(([rows]) => rows[0].count || 0);
}

/**
 * Find the document that references an uploaded file, whichever column it
 * landed in. Used to decide who is allowed to download that file.
 */
function findByAttachedFilename(filename, executor = pool) {
  const like = `%${filename}`;
  return executor
    .query(
      `SELECT id, student_id FROM documents
       WHERE file_path LIKE ? OR receipt_image_path LIKE ? OR official_receipt_path LIKE ?
       LIMIT 1`,
      [like, like, like]
    )
    .then(([rows]) => rows);
}

/** Every document requested and paid for in one transaction. */
function findByRequestGroup(requestGroupId, executor = pool) {
  return executor
    .query('SELECT * FROM documents WHERE request_group_id = ? ORDER BY id', [requestGroupId])
    .then(([rows]) => rows);
}

/** Row-locking read of a whole group — must be called inside a transaction. */
function findByRequestGroupForUpdate(requestGroupId, executor) {
  return executor
    .query('SELECT * FROM documents WHERE request_group_id = ? ORDER BY id FOR UPDATE', [requestGroupId])
    .then(([rows]) => rows);
}

/** One GCash receipt covers every document in the group. */
function updatePaymentSubmissionForGroup(
  requestGroupId, reference, receiptPath, paymentMethod = 'gcash', executor = pool
) {
  // `gcash_reference_no` is kept in step with `payment_reference_id` so older
  // records and any UI still reading the legacy column stay correct.
  return executor.query(
    `UPDATE documents
     SET current_status = "pending_payment_verification",
         payment_method = ?,
         payment_reference_id = ?,
         gcash_reference_no = ?,
         receipt_image_path = ?
     WHERE request_group_id = ? AND current_status IN ('pending_payment', 'pending_payment_verification')`,
    [paymentMethod, reference, reference, receiptPath, requestGroupId]
  );
}

/** Finance clears (or bounces) the whole group in one action. */
function updatePaymentVerificationForGroup(
  requestGroupId, newStatus, paymentStatus, officialReceiptPath, executor = pool
) {
  if (officialReceiptPath) {
    return executor.query(
      `UPDATE documents SET current_status = ?, payment_status = ?, official_receipt_path = ?
       WHERE request_group_id = ? AND current_status = 'pending_payment_verification'`,
      [newStatus, paymentStatus, officialReceiptPath, requestGroupId]
    );
  }
  return executor.query(
    `UPDATE documents SET current_status = ?, payment_status = ?
     WHERE request_group_id = ? AND current_status = 'pending_payment_verification'`,
    [newStatus, paymentStatus, requestGroupId]
  );
}

module.exports = {
  insert,
  findByAttachedFilename,
  findByRequestGroup,
  findByRequestGroupForUpdate,
  updatePaymentSubmissionForGroup,
  updatePaymentVerificationForGroup,
  findById,
  findByIdForUpdate,
  findByTrackingNumber,
  listWithFilters,
  countWithFilters,
  updateOcrData,
  updateAssignedClerk,
  updateStatusClearingClerk,
  updatePaymentSubmission,
  updatePaymentVerification,
  updateEvaluation,
  markCompleted,
  markPaidByTrackingNumber,
  deleteById,
  countProcessedTodayByClerk,
  countClearedBySecretaryToday,
  avgProcessingMinutes,
  avgOcrConfidence,
  countBacklog,
  countByStatus,
  countCompletedToday,
  forecastFallbackRows,
  countStepLogsToday,
};
