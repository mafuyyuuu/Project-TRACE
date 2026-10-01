const { pool } = require('../config/db');
async function lock(studentId, documentType, executor) {
  await executor.query(`INSERT INTO document_request_counters (student_id, document_type) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE student_id = student_id`, [studentId, documentType]);
  const [rows] = await executor.query('SELECT * FROM document_request_counters WHERE student_id = ? AND document_type = ? FOR UPDATE', [studentId, documentType]);
  return rows[0];
}
async function allocate(studentId, documentType, executor) {
  if (!studentId) return null;
  const row = await lock(studentId, documentType, executor);
  const next = Math.max(Number(row.last_number), row.original_issued ? 1 : 0) + 1;
  if (!Number.isSafeInteger(next) || next > 4294967295) throw new Error('Request sequence limit reached.');
  await executor.query('UPDATE document_request_counters SET last_number = ? WHERE student_id = ? AND document_type = ?', [next, studentId, documentType]);
  return `${documentType} – Request No. ${next}`;
}
async function recordOriginal(studentId, documentType, userId, notes, executor) {
  const row = await lock(studentId, documentType, executor);
  if (row.original_issued) return false;
  await executor.query(`UPDATE document_request_counters SET original_issued = TRUE, original_recorded_by = ?,
    original_recorded_at = NOW(), original_notes = ? WHERE student_id = ? AND document_type = ?`, [userId, notes, studentId, documentType]);
  return true;
}
function setDocumentSequence(id, label, executor = pool) {
  return executor.query('UPDATE documents SET document_sequence_number = ? WHERE id = ?', [label, id]);
}
module.exports = { allocate, recordOriginal, setDocumentSequence };
