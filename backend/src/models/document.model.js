const { pool } = require('../config/db');
const { STATUS, PIPELINE } = require('../utils/documentStatus');

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

/**
 * The Secretary takes the request on: any OCR corrections and the date the
 * student is promised, written together because they are one decision.
 */
function updateEvaluation(
  documentId, newStatus, studentId, studentName, documentType, estimatedReadyDate, executor = pool
) {
  return executor.query(
    `UPDATE documents SET
      current_status = ?,
      student_id = COALESCE(?, student_id),
      student_name = COALESCE(?, student_name),
      document_type = COALESCE(?, document_type),
      estimated_ready_date = COALESCE(?, estimated_ready_date)
     WHERE id = ?`,
    [newStatus, studentId, studentName, documentType, estimatedReadyDate || null, documentId]
  );
}

function markCompleted(documentId, executor = pool) {
  return executor.query('UPDATE documents SET current_status = ? WHERE id = ?', [STATUS.COMPLETED, documentId]);
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
       FROM documents d WHERE d.current_status = ?`,
      [STATUS.COMPLETED]
    )
    .then(([rows]) => parseFloat(rows[0].avg_minutes) || 0);
}

function avgOcrConfidence(executor = pool) {
  return executor
    .query('SELECT AVG(ocr_confidence_score) as avg_confidence FROM documents WHERE ocr_confidence_score IS NOT NULL')
    .then(([rows]) => parseFloat(rows[0].avg_confidence) || 0);
}

/**
 * Everything still in flight: every pipeline status except the last one.
 *
 * Derived from PIPELINE rather than listed, so adding a desk to the workflow
 * cannot silently leave a queue out of the backlog figure.
 */
const IN_FLIGHT = PIPELINE.slice(0, -1);

function countBacklog(executor = pool) {
  return executor
    .query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status IN (${IN_FLIGHT.map(() => '?').join(', ')})`,
      IN_FLIGHT
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
      'SELECT COUNT(*) as count FROM documents WHERE current_status = ? AND DATE(updated_at) = CURDATE()',
      [STATUS.COMPLETED]
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

/** One digital receipt covers every document in the group. */
function updatePaymentSubmissionForGroup(
  requestGroupId, reference, receiptPath, paymentMethod = 'gcash', executor = pool
) {
  // `gcash_reference_no` is kept in step with `payment_reference_id` so older
  // records and any UI still reading the legacy column stay correct.
  //
  // Re-submitting over a document already awaiting verification is allowed on
  // purpose: a student who uploaded the wrong screenshot must be able to
  // replace it without Finance having to bounce it first.
  return executor.query(
    `UPDATE documents
     SET current_status = ?,
         payment_channel = 'digital',
         payment_method = ?,
         payment_reference_id = ?,
         gcash_reference_no = ?,
         receipt_image_path = ?
     WHERE request_group_id = ? AND current_status IN (?, ?)`,
    [
      STATUS.PENDING_FINANCE_VERIFICATION, paymentMethod, reference, reference, receiptPath,
      requestGroupId, STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_FINANCE_VERIFICATION,
    ]
  );
}

/**
 * Finance clears (or bounces) the whole group in one action.
 *
 * `orNumber`/`orDate` are COALESCE-d rather than overwritten so a walk-in's
 * number — already recorded by logWalkInPayment before this ever runs — isn't
 * blanked when Finance approves without retyping it.
 */
function updatePaymentVerificationForGroup(
  requestGroupId, newStatus, paymentStatus, { officialReceiptPath, orNumber, orDate } = {}, executor = pool
) {
  return executor.query(
    `UPDATE documents SET
       current_status = ?,
       payment_status = ?,
       official_receipt_path = COALESCE(?, official_receipt_path),
       or_number = COALESCE(?, or_number),
       or_date = COALESCE(?, or_date)
     WHERE request_group_id = ? AND current_status = ?`,
    [
      newStatus, paymentStatus, officialReceiptPath || null, orNumber || null, orDate || null,
      requestGroupId, STATUS.PENDING_FINANCE_VERIFICATION,
    ]
  );
}

// ---------------------------------------------------------------------------
// Evaluate-first pipeline writes
// ---------------------------------------------------------------------------

/**
 * Replace the supporting attachment.
 *
 * Window 1 scans paperwork a walk-in student brought to the counter, which is
 * the only copy that will ever exist for that request.
 */
function updateAttachment(documentId, filePath, originalFilename, executor = pool) {
  return executor.query(
    'UPDATE documents SET file_path = ?, original_filename = ? WHERE id = ?',
    [filePath, originalFilename, documentId]
  );
}

/** Plain status move, for desk actions that carry no other data. */
function updateStatus(documentId, newStatus, executor = pool) {
  return executor.query('UPDATE documents SET current_status = ? WHERE id = ?', [newStatus, documentId]);
}

/**
 * Secretary prices one document from what printing it actually took.
 *
 * The author and timestamp are written in the same statement as the amount,
 * never afterwards: a charge whose origin is unknown cannot be defended when a
 * student disputes it, and this is the only place a price is ever set.
 */
function updatePricing(documentId, { amount, pageCount, pricingNotes, clerkId }, executor = pool) {
  return executor.query(
    `UPDATE documents
     SET amount = ?, page_count = ?, pricing_notes = ?, priced_by_clerk_id = ?, priced_at = NOW()
     WHERE id = ?`,
    [amount, pageCount ?? null, pricingNotes || null, clerkId, documentId]
  );
}

/**
 * How many documents in the group are still waiting on a price.
 *
 * This is the billing gate. A student pays for a request once, so the group
 * only becomes payable when the last of its documents has been priced —
 * otherwise a two-document request would generate two bills.
 */
function countUnpricedInGroup(requestGroupId, executor = pool) {
  return executor
    .query(
      'SELECT COUNT(*) AS count FROM documents WHERE request_group_id = ? AND priced_at IS NULL',
      [requestGroupId]
    )
    .then(([rows]) => rows[0].count);
}

/** Total owed for the whole request — the figure on the stub. */
function sumGroupAmount(requestGroupId, executor = pool) {
  return executor
    .query('SELECT COALESCE(SUM(amount), 0) AS total FROM documents WHERE request_group_id = ?', [requestGroupId])
    .then(([rows]) => parseFloat(rows[0].total));
}

/**
 * Every document is priced, so the group becomes payable and the stub the
 * student can carry to Finance is timestamped.
 */
function markGroupPayable(requestGroupId, executor = pool) {
  return executor.query(
    `UPDATE documents
     SET current_status = ?, stub_issued_at = NOW()
     WHERE request_group_id = ? AND current_status = ?`,
    [STATUS.PENDING_STUDENT_PAYMENT, requestGroupId, STATUS.SEC_PROCESSING]
  );
}

/**
 * Finance logs a payment collected at the counter.
 *
 * A walk-in leaves no student-uploaded screenshot behind — the Official Receipt
 * Finance issues is the only proof the payment happened, which is why the OR
 * number is mandatory here and absent from the digital path.
 */
function updateWalkInPaymentForGroup(
  requestGroupId, { orNumber, orDate, clerkId, receiptPath }, executor = pool
) {
  return executor.query(
    `UPDATE documents
     SET current_status = ?,
         payment_channel = 'walk_in',
         or_number = ?,
         or_date = ?,
         logged_by_clerk_id = ?,
         official_receipt_path = COALESCE(?, official_receipt_path)
     WHERE request_group_id = ? AND current_status = ?`,
    [
      STATUS.PENDING_FINANCE_VERIFICATION, orNumber, orDate || null, clerkId, receiptPath || null,
      requestGroupId, STATUS.PENDING_STUDENT_PAYMENT,
    ]
  );
}

/**
 * Secretary checks the Official Receipt paperwork before the printed document
 * can be handed to Window 1.
 *
 * Author and timestamp are written in the same statement as the status, same
 * as updatePricing — a step nobody can trace back to a person is not
 * auditable, and this never touches payment_status: only Finance sets PAID.
 */
function updateOrVerification(documentId, clerkId, executor = pool) {
  return executor.query(
    `UPDATE documents
     SET current_status = ?, or_verified_by_clerk_id = ?, or_verified_at = NOW()
     WHERE id = ?`,
    [STATUS.SEC_OR_VERIFIED, clerkId, documentId]
  );
}

module.exports = {
  insert,
  updateAttachment,
  updateStatus,
  updatePricing,
  countUnpricedInGroup,
  sumGroupAmount,
  markGroupPayable,
  updateWalkInPaymentForGroup,
  updateOrVerification,
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
  updateEvaluation,
  markCompleted,
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
