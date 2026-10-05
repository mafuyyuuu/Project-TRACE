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
async function history(requirementId, documentId, before, executor = pool) {
  const cursor = before === undefined || before === null || before === '' ? null : Number(before);
  if (cursor !== null && (!Number.isSafeInteger(cursor) || cursor < 1)) throw require('../utils/AppError').badRequest('Invalid history cursor.');
  // Snapshots retain the original IDs after a cancelled case deletes its rows.
  const [rows] = await require('./supportTicket.model').query(executor, `SELECT e.id,e.event_type,e.snapshot,e.created_at,u.full_name AS actor_name
    FROM request_attachment_events e LEFT JOIN users u ON u.id=e.actor_id
    WHERE JSON_EXTRACT(e.snapshot,'$.id')=? AND JSON_EXTRACT(e.snapshot,'$.document_id')=?
    ${cursor ? 'AND e.id < ?' : ''} ORDER BY e.id DESC LIMIT 51`, [Number(requirementId),Number(documentId),...(cursor ? [cursor] : [])]);
  return {events:rows.slice(0,50).map(row => ({...row,snapshot:typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot})),next_cursor:rows.length>50 ? rows[49].id : null};
}
async function lock(id, documentId, executor) {
  const [rows] = await executor.query('SELECT * FROM request_attachment_requirements WHERE id = ? AND document_id = ? FOR UPDATE', [id, documentId]);
  return rows[0];
}
async function create(documentId, userId, label, instructions, executor, identity) {
  const [result] = await executor.query('INSERT INTO request_attachment_requirements (document_id, requested_by, label, instructions,catalog_id,identity_key,replacement_of) VALUES (?, ?, ?, ?,?,?,?)', [documentId, userId, label, instructions,identity.catalog_id,identity.identity_key,identity.replacement_of || null]);
  return result.insertId;
}
function supersede(id, executor) { return executor.query('UPDATE request_attachment_requirements SET superseded_at=CURRENT_TIMESTAMP WHERE id=?',[id]); }
function event(row, actorId, kind, executor) {
  return executor.query('INSERT INTO request_attachment_events(requirement_id,document_id,actor_id,event_type,snapshot,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))',[row.id,row.document_id,actorId,kind,JSON.stringify(row)]);
}
function bubble(row, executor) {
  // One persisted request bubble per ticket/requirement. Its original position
  // does not change when the upload or review state changes.
  return executor.query(`INSERT INTO support_ticket_messages(ticket_id,kind,message,metadata,import_key,created_at)
    SELECT t.id,'requirement',?, ?,CONCAT('requirement:',t.id,':',?),UTC_TIMESTAMP(3)
    FROM support_tickets t WHERE t.document_id=?
    ON DUPLICATE KEY UPDATE metadata=VALUES(metadata)`,[`Additional document: ${row.label}`,JSON.stringify({requirement_id:row.id,document_id:row.document_id,snapshot:row}),row.id,row.document_id]);
}
async function uploads(documentId, executor) {
  const [rows] = await executor.query(`SELECT a.*,r.label,r.id AS requirement_id FROM request_attachment_uploads a
    JOIN request_attachment_requirements r ON r.id=a.requirement_id WHERE r.document_id=? ORDER BY a.id`,[documentId]); return rows;
}
function upload(id, userId, file, executor) {
  return executor.query('INSERT INTO request_attachment_uploads (requirement_id, uploaded_by, file_path, original_filename) VALUES (?, ?, ?, ?)', [id, userId, `/uploads/${file.filename}`, file.originalname]);
}
function markUploaded(id, executor) { return executor.query("UPDATE request_attachment_requirements SET status = 'uploaded' WHERE id = ?", [id]); }
function review(id, userId, action, notes, executor) {
  return executor.query('UPDATE request_attachment_requirements SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?', [action === 'accept' ? 'accepted' : 'rejected', userId, notes || null, id]);
}
async function fileOwner(filename, executor = pool) {
  const [rows] = await executor.query(`SELECT d.* FROM request_attachment_uploads a
    JOIN request_attachment_requirements r ON r.id = a.requirement_id JOIN documents d ON d.id = r.document_id
    WHERE a.file_path = ?`, [`/uploads/${filename}`]);
  return rows[0];
}
module.exports = { list, history, lock, create, supersede, event, bubble, uploads, upload, markUploaded, review, fileOwner };
