const { pool } = require('../config/db');
// New support timestamps are UTC DATETIME values. Decode them as UTC even when
// a developer runs Node in Manila; do not change legacy pool date behavior.
function query(executor, sql, values = []) {
  return executor.query({ sql, typeCast(field, next) {
    if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
      const value = field.string();
      return value === null ? null : new Date(value.replace(' ', 'T') + 'Z');
    }
    return next();
  } }, values.map(value => value instanceof Date ? value.toISOString().replace('T', ' ').replace('Z', '') : value));
}

const columns = `t.*,u.student_id,u.full_name AS student_name,u.college_id,u.course,
  d.current_status,d.tracking_number,d.document_type,clerk.full_name AS clerk_name`;
const joins = `FROM support_tickets t JOIN users u ON u.id=t.student_user_id
  LEFT JOIN documents d ON d.id=t.document_id LEFT JOIN users clerk ON clerk.id=t.assigned_to`;
async function actor(id, executor = pool, lock = false) {
  const [rows] = await query(executor,`SELECT id,role,desk_assignment,is_active,college_id,course,full_name,email_verified_at FROM users WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0];
}
async function settings(executor = pool, lock = false) {
  const [rows] = await query(executor,`SELECT settings FROM support_settings WHERE id=1${lock ? ' FOR UPDATE' : ''}`);
  if (!rows[0]) throw new Error('SUPPORT_SETTINGS_MISSING');
  return typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
}
function saveSettings(settings, actorId, executor) { return query(executor,'UPDATE support_settings SET settings=?,updated_by=?,updated_at=UTC_TIMESTAMP(3) WHERE id=1', [JSON.stringify(settings), actorId]); }
async function ticket(id, executor = pool, lock = false) {
  if (lock) await query(executor,'SELECT id FROM support_tickets WHERE id=? FOR UPDATE', [id]);
  const [rows] = await query(executor,`SELECT ${columns} ${joins} WHERE t.id=?`, [id]);
  return rows[0];
}
async function list(scope, params, before, executor = pool) {
  const [rows] = await query(executor,`SELECT ${columns} ${joins} WHERE ${scope} ${before ? 'AND t.id < ?' : ''} ORDER BY t.id DESC LIMIT 21`, [...params, ...(before ? [before] : [])]);
  return { tickets: rows.slice(0, 20), next_cursor: rows.length > 20 ? rows[19].id : null };
}
async function openGeneral(studentId, executor) {
  const [rows] = await query(executor,"SELECT id FROM support_tickets WHERE student_user_id=? AND category<>'linked' AND state<>'RESOLVED' LIMIT 1 FOR UPDATE", [studentId]);
  return rows[0];
}
async function linked(documentId, executor) {
  const [rows] = await query(executor,"SELECT id FROM support_tickets WHERE document_id=? AND state<>'RESOLVED' ORDER BY id DESC LIMIT 1 FOR UPDATE", [documentId]);
  return rows[0];
}
async function context(documentId, ownerId, executor = pool) {
  const [rows]=await query(executor,`SELECT id FROM support_tickets WHERE ${documentId ? 'document_id=?' : "student_user_id=? AND category<>'linked'"} ORDER BY (state='RESOLVED'),id DESC LIMIT 1`,[documentId || ownerId]);return rows[0];
}
async function create(studentId, documentId, subject, category, executor) {
  const [result] = await query(executor,"INSERT INTO support_tickets(student_user_id,document_id,subject,category,state,created_at,updated_at) VALUES (?,?,?,?,'FAQ_ASSISTANCE',UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))", [studentId, documentId, subject, category]);
  return result.insertId;
}
function update(id, values, executor) {
  const allowed = ['state','category','assigned_to','queued_at','claimed_at','reply_requested_at','reply_clock','warned_at','resolved_at'];
  const entries = Object.entries(values);
  if (!entries.length || entries.some(([key]) => !allowed.includes(key))) throw new Error('INVALID_TICKET_UPDATE');
  return query(executor,`UPDATE support_tickets SET ${entries.map(([key]) => `${key}=?`).join(',')},updated_at=UTC_TIMESTAMP(3) WHERE id=?`, [...entries.map(([key,value]) => key === 'reply_clock' && value ? JSON.stringify(value) : value), id]);
}
async function eventExists(key, executor) { const [rows] = await query(executor,'SELECT id,ticket_id,event_type,data FROM support_ticket_events WHERE event_key=?', [key]); return rows[0]; }
function event(id, actorId, type, key, data, executor) {
  return query(executor,'INSERT INTO support_ticket_events(ticket_id,actor_id,event_type,event_key,data,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))', [id, actorId, type, key, JSON.stringify(data || {})]);
}
function system(id, text, metadata, executor) {
  return query(executor,"INSERT INTO support_ticket_messages(ticket_id,kind,message,metadata,created_at) VALUES (?,'system',?,?,UTC_TIMESTAMP(3))", [id, text, JSON.stringify(metadata || {})]);
}
async function priorSend(senderId, key, executor) {
  const [rows] = await query(executor,'SELECT * FROM support_ticket_messages WHERE sender_id=? AND client_key=?', [senderId, key]); return rows[0];
}
async function send(ticketId, senderId, text, key, hash, executor) {
  const [row] = await query(executor,'INSERT INTO support_ticket_messages(ticket_id,sender_id,message,client_key,payload_hash,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))', [ticketId,senderId,text,key,hash]); return row.insertId;
}
function file(messageId, file, executor) {
  return query(executor,'INSERT INTO support_ticket_files(message_id,filename,original_name,mime_type,size_bytes) VALUES (?,?,?,?,?)', [messageId,file.filename,file.originalname,file.mimetype,file.size]);
}
async function files(messageIds, executor = pool) {
  if (!messageIds.length) return [];
  const [rows] = await query(executor,'SELECT id,message_id,filename,original_name,mime_type,size_bytes FROM support_ticket_files WHERE message_id IN (?) ORDER BY id', [messageIds]); return rows;
}
function archiveFile(documentId, requirementId, file, executor) {
  return query(executor,`INSERT INTO support_ticket_files(message_id,filename,original_name,mime_type,size_bytes)
    SELECT m.id,?,?,?,? FROM support_ticket_messages m JOIN support_tickets t ON t.id=m.ticket_id
    WHERE t.document_id=? AND m.import_key=CONCAT('requirement:',t.id,':',?) LIMIT 1
    ON DUPLICATE KEY UPDATE original_name=VALUES(original_name)`,[file.filename,file.originalname,file.mimetype,file.size,documentId,requirementId]);
}
async function history(id, before, executor = pool) {
  const [rows] = await query(executor,`SELECT m.*,u.full_name AS sender_name,u.role AS sender_role FROM support_ticket_messages m
    LEFT JOIN users u ON u.id=m.sender_id WHERE m.ticket_id=? ${before ? 'AND m.id < ?' : ''} ORDER BY m.id DESC LIMIT 51`, [id,...(before ? [before] : [])]);
  const messages = rows.slice(0,50).reverse();
  const uploads = await files(messages.map(row => row.id), executor);
  return { messages: messages.map(({ payload_hash,client_key,import_key,...row }) => ({ ...row,files: uploads.filter(file => file.message_id === row.id) })), next_cursor: rows.length > 50 ? messages[0].id : null };
}
async function fileOwner(filename, executor = pool) {
  const [rows] = await query(executor,'SELECT f.*,m.ticket_id FROM support_ticket_files f JOIN support_ticket_messages m ON m.id=f.message_id WHERE f.filename=?', [filename]); return rows[0];
}
function availability(id, available, executor) {
  return query(executor,'INSERT INTO support_availability(user_id,available) VALUES (?,?) ON DUPLICATE KEY UPDATE available=VALUES(available),updated_at=UTC_TIMESTAMP(3)', [id, available]);
}
async function currentAssignment(id, executor) {
  const [rows] = await query(executor,"SELECT id FROM support_tickets WHERE assigned_to=? AND state='IN_PROGRESS' LIMIT 1 FOR UPDATE", [id]); return rows[0];
}
async function available(id, executor) { const [rows] = await query(executor,'SELECT available FROM support_availability WHERE user_id=?', [id]); return Boolean(rows[0]?.available); }
async function oldest(executor) {
  const [rows] = await query(executor,`SELECT t.id FROM support_tickets t JOIN users u ON u.id=t.student_user_id
    LEFT JOIN documents d ON d.id=t.document_id WHERE t.state='QUEUED' AND u.is_active=TRUE
    AND (t.category<>'linked' OR d.current_status IN ('PENDING_W1_INTAKE','PENDING_SEC_EVALUATION','SEC_PROCESSING','PENDING_STUDENT_PAYMENT','PENDING_FINANCE_VERIFICATION','PAID_PENDING_SEC_RELEASE','SEC_OR_VERIFIED','READY_FOR_RELEASE'))
    ORDER BY t.queued_at,t.id LIMIT 1 FOR UPDATE`);
  return rows[0];
}
async function timers(executor, after = 0) {
  const [rows] = await query(executor,"SELECT id FROM support_tickets WHERE state='IN_PROGRESS' AND reply_requested_at IS NOT NULL AND id>? ORDER BY id LIMIT 100", [after]); return rows;
}
async function events(from, to, executor = pool) {
  const [rows] = await query(executor,'SELECT * FROM support_ticket_events WHERE created_at>=? AND created_at<? ORDER BY ticket_id,id', [from,to]); return rows;
}
async function queueInfo(ticket, executor = pool) {
  const [capacity] = await query(executor, `SELECT COUNT(*) AS count FROM support_availability a JOIN users u ON u.id=a.user_id
    WHERE a.available=TRUE AND u.is_active=TRUE AND u.role='clerk' AND u.desk_assignment IN ('Window 1','Receiving Desk')
    AND NOT EXISTS(SELECT 1 FROM support_tickets busy WHERE busy.assigned_to=u.id AND busy.state='IN_PROGRESS')`);
  let position=null;
  if(ticket.state==='QUEUED') {
    const [rows]=await query(executor, `SELECT COUNT(*) AS ahead FROM support_tickets t JOIN users u ON u.id=t.student_user_id
      LEFT JOIN documents d ON d.id=t.document_id WHERE t.state='QUEUED' AND u.is_active=TRUE
      AND (t.category<>'linked' OR d.current_status IN ('PENDING_W1_INTAKE','PENDING_SEC_EVALUATION','SEC_PROCESSING','PENDING_STUDENT_PAYMENT','PENDING_FINANCE_VERIFICATION','PAID_PENDING_SEC_RELEASE','SEC_OR_VERIFIED','READY_FOR_RELEASE'))
      AND (t.queued_at < ? OR (t.queued_at = ? AND t.id < ?))`,[ticket.queued_at,ticket.queued_at,ticket.id]);
    position=Number(rows[0].ahead)+1;
  }
  const [episodes]=await query(executor, `SELECT e.ticket_id,e.event_type,e.created_at,e.data FROM support_ticket_events e
    WHERE e.event_type IN ('claimed','resolve','await_student','response_timeout') AND e.ticket_id IN
    (SELECT recent.id FROM (SELECT id FROM support_tickets WHERE imported=FALSE AND state='RESOLVED' ORDER BY resolved_at DESC LIMIT 30) recent)
    ORDER BY e.ticket_id,e.id`);
  return {position,available_clerks:Number(capacity[0].count),episodes};
}
module.exports = { query, queueInfo, actor,settings,saveSettings,ticket,list,context,openGeneral,linked,create,update,eventExists,event,system,priorSend,send,file,archiveFile,files,history,fileOwner,availability,currentAssignment,available,oldest,timers,events };

async function requirementMessage(ticketId, requirementId) {
  const [rows] = await query(pool, 'SELECT metadata FROM support_ticket_messages WHERE ticket_id=? AND kind=? AND import_key=?', [ticketId,'requirement',`requirement:${ticketId}:${requirementId}`]);
  return rows[0]?.metadata;
}
module.exports.requirementMessage = requirementMessage;
