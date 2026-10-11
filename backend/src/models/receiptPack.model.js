const { pool } = require('../config/db');
const parse = row => row ? { ...row, ...(row.pattern ? { pattern: typeof row.pattern === 'string' ? JSON.parse(row.pattern) : row.pattern } : {}), ...(row.snapshot ? { snapshot: typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot } : {}) } : null;
async function control(executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM finance_receipt_control WHERE id=1${lock ? ' FOR UPDATE' : ''}`); return rows[0]; }
async function pack(id, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM finance_receipt_packs WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]); return parse(rows[0]); }
async function audit(type, userId, data, executor, packId = null, receiptId = null) { await executor.query('INSERT INTO finance_receipt_events (pack_id,receipt_id,actor_id,event_type,data) VALUES (?,?,?,?,?)', [packId,receiptId,userId,type,JSON.stringify(data)]); }
async function available(serials, executor) {
 const marks = serials.map(() => '?').join(',');
 const [reserved] = await executor.query(`SELECT serial FROM finance_receipt_serials WHERE serial IN (${marks}) LIMIT 1`, serials);
 const [historical] = await executor.query(`SELECT or_number FROM documents WHERE or_number IN (${marks}) LIMIT 1 FOR UPDATE`, serials);
 return !reserved.length && !historical.length;
}
async function activate(pattern, serials, userId, reason, oldId, executor) {
 if (oldId) await executor.query('UPDATE finance_receipt_packs SET active=FALSE,archived_at=CURRENT_TIMESTAMP WHERE id=?', [oldId]);
 const [insert] = await executor.query('INSERT INTO finance_receipt_packs (pattern,start_serial,created_by,replacement_reason) VALUES (?,?,?,?)', [JSON.stringify(pattern),serials[0],userId,reason || null]);
 for (let index=0;index<50;index++) await executor.query('INSERT INTO finance_receipt_serials (serial,pack_id,position) VALUES (?,?,?)', [serials[index],insert.insertId,index]);
 await executor.query('UPDATE finance_receipt_control SET active_pack_id=?,version=version+1 WHERE id=1', [insert.insertId]);
 return insert.insertId;
}
async function current(group, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM finance_issued_receipts WHERE active_group=?${lock ? ' FOR UPDATE' : ''}`, [group]); return parse(rows[0]); }
async function retry(key, executor, lock = false) { const [rows] = await executor.query(`SELECT * FROM finance_issued_receipts WHERE client_key=?${lock ? ' FOR UPDATE' : ''}`, [key]); return parse(rows[0]); }
async function get(id, executor = pool, lock = false) { const [rows] = await executor.query(`SELECT * FROM finance_issued_receipts WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]); return parse(rows[0]); }
async function insertReceipt(data, executor) {
 const [insert] = await executor.query('INSERT INTO finance_issued_receipts (request_group_id,active_group,document_id,pack_id,serial,client_key,snapshot,cashier_id,issue_date,copy_path) VALUES (?,?,?,?,?,?,?,?,?,?)', [data.group,data.group,data.document_id,data.pack.id,data.serial,data.client_key,JSON.stringify(data.snapshot),data.snapshot.cashier_id,data.snapshot.issue_date,data.copy_path || null]);
 const [claimed] = await executor.query("UPDATE finance_receipt_serials SET receipt_id=?,state='ISSUED' WHERE pack_id=? AND position=? AND receipt_id IS NULL", [insert.insertId,data.pack.id,data.pack.consumed]);
 if (claimed.affectedRows !== 1) throw new Error('Receipt reservation changed.');
 const [advanced] = await executor.query('UPDATE finance_receipt_packs SET consumed=consumed+1 WHERE id=? AND consumed<50', [data.pack.id]);
 if (advanced.affectedRows !== 1) throw new Error('Receipt pack changed during allocation.');
 return { id:insert.insertId,request_group_id:data.group,document_id:data.document_id,pack_id:data.pack.id,serial:data.serial,client_key:data.client_key,snapshot:data.snapshot,state:'ISSUED',cashier_id:data.snapshot.cashier_id,issue_date:data.snapshot.issue_date,copy_path:data.copy_path || null };
}
async function history(executor = pool) {
 const [packs] = await executor.query('SELECT * FROM finance_receipt_packs ORDER BY id DESC LIMIT 25');
 const [events] = await executor.query('SELECT * FROM finance_receipt_events ORDER BY id DESC LIMIT 100');
 const [receipts] = await executor.query('SELECT * FROM finance_issued_receipts ORDER BY id DESC LIMIT 100');
 return {packs:packs.map(parse),events,receipts:receipts.map(parse)};
}
async function publish(id, path, executor) { await executor.query('UPDATE finance_issued_receipts SET copy_path=? WHERE id=? AND copy_path IS NULL', [path,id]); }
async function voidReceipt(id, reason, executor) {
 await executor.query("UPDATE finance_issued_receipts SET state='VOID',active_group=NULL,void_reason=? WHERE id=? AND state='ISSUED'", [reason,id]);
 await executor.query("UPDATE finance_receipt_serials SET state='VOID' WHERE receipt_id=?", [id]);
}
async function writeGroup(group, number, date, path, executor) {
 await executor.query('UPDATE documents SET or_number=?,or_date=?,official_receipt_path=?,or_uploaded_at=CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END WHERE COALESCE(request_group_id,tracking_number)=? AND payment_status=\'PAID\'', [number,date,path || null,path || null,group]);
}
async function savePrint(config, version, executor) { const [r] = await executor.query('UPDATE finance_receipt_control SET print_config=?,version=version+1 WHERE id=1 AND version=?', [JSON.stringify(config),version]); return r.affectedRows; }
async function group(groupId,executor) { const [rows]=await executor.query('SELECT * FROM documents WHERE COALESCE(request_group_id,tracking_number)=? ORDER BY id FOR UPDATE',[groupId]);return rows; }
async function numberConflict(serial,groupId,executor) {
 const [rows]=await executor.query('SELECT id FROM documents WHERE or_number=? AND COALESCE(request_group_id,tracking_number)<>? LIMIT 1 FOR UPDATE',[serial,groupId]);return rows.length>0;
}
async function reserved(serial,executor) {const [rows]=await executor.query('SELECT serial FROM finance_receipt_serials WHERE serial=? LIMIT 1 FOR UPDATE',[serial]);return rows.length>0;}
async function printEvents(id,clientKey,executor) {
 const [prior]=await executor.query("SELECT id FROM finance_receipt_events WHERE receipt_id=? AND event_type IN ('print_requested','reprint_requested') AND JSON_UNQUOTE(JSON_EXTRACT(data,'$.client_key'))=? LIMIT 1",[id,clientKey]);
 const [counts]=await executor.query("SELECT COUNT(*) AS count FROM finance_receipt_events WHERE receipt_id=? AND event_type IN ('print_requested','reprint_requested')",[id]);
 return {prior:prior.length>0,count:Number(counts[0].count)};
}
module.exports = { group, numberConflict, reserved, printEvents, control, pack, audit, available, activate, current, retry, get, insertReceipt, history, publish, voidReceipt, writeGroup, savePrint };
