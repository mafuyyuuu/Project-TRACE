const { pool } = require('../config/db');
const { query } = require('./supportTicket.model');
const desks = "('Window 1','Receiving Desk','Finance','Secretary')";
const collegeJoin = alias => `LEFT JOIN colleges ${alias}c ON (${alias}c.id=${alias}.college_id OR (${alias}.college_id IS NULL AND ${alias}c.name=${alias}.course)) AND ${alias}c.is_active=TRUE`;
const projection = alias => `${alias}.id,${alias}.role,${alias}.desk_assignment,${alias}.is_active,${alias}.full_name,${alias}c.id AS resolved_college_id,${alias}c.name AS college_name`;
async function actors(ids,executor = pool,lock = false) {
  const sorted = [...new Set(ids)].sort((a,b) => a-b);
  if (lock) for (const id of sorted) await query(executor,'SELECT id FROM users WHERE id=? FOR UPDATE',[id]);
  const [rows] = await query(executor,`SELECT ${projection('u')} FROM users u ${collegeJoin('u')} WHERE u.id IN (${sorted.map(() => '?').join(',')}) ORDER BY u.id`,sorted);
  return rows;
}
async function recipients(actor,search,before,executor = pool) {
  const values = [actor.id],conditions = [`u.id<>? AND u.role='clerk' AND u.is_active=TRUE AND u.desk_assignment IN ${desks}`,
    "(u.desk_assignment<>'Secretary' OR uc.id IS NOT NULL)"];
  if (actor.desk_assignment === 'Secretary') {conditions.push("(u.desk_assignment<>'Secretary' OR uc.id=?)");values.push(actor.resolved_college_id);}
  if (search) {conditions.push('(LOCATE(LOWER(?),LOWER(u.full_name))>0 OR LOCATE(LOWER(?),LOWER(u.desk_assignment))>0)');values.push(search,search);}
  if (before) {conditions.push('u.id<?');values.push(before);}
  const [rows] = await query(executor,`SELECT ${projection('u')} FROM users u ${collegeJoin('u')} WHERE ${conditions.join(' AND ')} ORDER BY u.id DESC LIMIT 21`,values);
  return {recipients:rows.slice(0,20),next_cursor:rows.length>20 ? rows[19].id : null};
}
const joins = `FROM staff_conversations t JOIN users lo ON lo.id=t.participant_low JOIN users hi ON hi.id=t.participant_high ${collegeJoin('lo')} ${collegeJoin('hi')}`;
const columns = `t.*,lo.full_name AS low_name,hi.full_name AS high_name,
  lo.desk_assignment AS low_desk,hi.desk_assignment AS high_desk,lo.role AS low_role,hi.role AS high_role,
  lo.is_active AS low_active,hi.is_active AS high_active,loc.id AS low_college_id,hic.id AS high_college_id`;
async function conversation(id,executor = pool,lock = false) {
  if (lock) await query(executor,'SELECT id FROM staff_conversations WHERE id=? FOR UPDATE',[id]);
  const [rows] = await query(executor,`SELECT ${columns} ${joins} WHERE t.id=?`,[id]);return rows[0];
}
async function list(actor,before,executor = pool) {
  const where = [],values = [];
  if (actor.role !== 'admin') {
    where.push('(t.participant_low=? OR t.participant_high=?)');values.push(actor.id,actor.id);
    if (actor.desk_assignment === 'Secretary') {where.push('t.scope_college_id=?');values.push(actor.resolved_college_id);}
  }
  if (before) {where.push('t.id<?');values.push(before);}
  const [rows] = await query(executor,`SELECT ${columns} ${joins} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.id DESC LIMIT 21`,values);
  return {conversations:rows.slice(0,20),next_cursor:rows.length>20 ? rows[19].id : null};
}
async function pair(low,high,scope,executor) {
  const [rows] = await query(executor,'SELECT id FROM staff_conversations WHERE participant_low=? AND participant_high=? AND scope_college_id=?',[low,high,scope]);return rows[0];
}
async function create(low,high,scope,executor) {
  const [row] = await query(executor,'INSERT INTO staff_conversations(participant_low,participant_high,scope_college_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))',[low,high,scope]);return row.insertId;
}
async function message(thread,actor,text,executor) {
  const [row] = await query(executor,'INSERT INTO staff_conversation_messages(conversation_id,sender_id,message,created_at) VALUES (?,?,?,UTC_TIMESTAMP(3))',[thread,actor,text]);
  await query(executor,'UPDATE staff_conversations SET updated_at=UTC_TIMESTAMP(3) WHERE id=?',[thread]);return row.insertId;
}
async function prior(actor,key,executor) {
  const [rows] = await query(executor,'SELECT conversation_id,event_type,payload_hash,message_id FROM staff_conversation_events WHERE actor_id=? AND client_key=?',[actor,key]);return rows[0];
}
function event(thread,actor,type,key,hash,messageId,executor) {
  return query(executor,'INSERT INTO staff_conversation_events(conversation_id,actor_id,event_type,client_key,payload_hash,message_id,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(3))',[thread,actor,type,key,hash,messageId]);
}
async function history(thread,before,executor = pool) {
  const [rows] = await query(executor,`SELECT m.id,m.sender_id,u.full_name AS sender_name,m.message,m.created_at FROM staff_conversation_messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ${before ? 'AND m.id<?' : ''} ORDER BY m.id DESC LIMIT 51`,[thread,...(before ? [before] : [])]);
  return {messages:rows.slice(0,50).reverse(),next_cursor:rows.length>50 ? rows[49].id : null};
}
module.exports = {actors,recipients,conversation,list,pair,create,message,prior,event,history};
