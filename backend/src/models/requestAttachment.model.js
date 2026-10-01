const { pool } = require('../config/db');
async function list(documentId, executor = pool) {
  const [rows] = await executor.query(`SELECT r.*, a.file_path, a.original_filename, a.created_at AS uploaded_at,
    requester.full_name AS requested_by_name, reviewer.full_name AS reviewed_by_name
    FROM request_attachment_requirements r LEFT JOIN request_attachment_uploads a ON a.id =
    (SELECT MAX(u.id) FROM request_attachment_uploads u WHERE u.requirement_id = r.id)
    LEFT JOIN users requester ON requester.id = r.requested_by LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
    WHERE r.document_id = ? ORDER BY r.id`, [documentId]);
  return rows;
}
async function lock(id, documentId, executor) {
  const [rows] = await executor.query('SELECT * FROM request_attachment_requirements WHERE id = ? AND document_id = ? FOR UPDATE', [id, documentId]);
  return rows[0];
}
function create(documentId, userId, label, instructions, executor) {
  return executor.query('INSERT INTO request_attachment_requirements (document_id, requested_by, label, instructions) VALUES (?, ?, ?, ?)', [documentId, userId, label, instructions]);
}
function upload(id, userId, file, executor) {
  return executor.query('INSERT INTO request_attachment_uploads (requirement_id, uploaded_by, file_path, original_filename) VALUES (?, ?, ?, ?)', [id, userId, `/uploads/${file.filename}`, file.originalname]);
}
function markUploaded(id, executor) { return executor.query("UPDATE request_attachment_requirements SET status = 'uploaded' WHERE id = ?", [id]); }
function review(id, userId, action, notes, executor) {
  return executor.query('UPDATE request_attachment_requirements SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?', [action === 'accept' ? 'accepted' : 'requested', userId, notes || null, id]);
}
async function fileOwner(filename, executor = pool) {
  const [rows] = await executor.query(`SELECT d.* FROM request_attachment_uploads a
    JOIN request_attachment_requirements r ON r.id = a.requirement_id JOIN documents d ON d.id = r.document_id
    WHERE a.file_path = ?`, [`/uploads/${filename}`]);
  return rows[0];
}
module.exports = { list, lock, create, upload, markUploaded, review, fileOwner };
