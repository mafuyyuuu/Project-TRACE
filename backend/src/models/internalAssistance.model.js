const { pool } = require('../config/db');
const { query } = require('./supportTicket.model');
const columns = `t.*,creator.full_name AS creator_name,admin.full_name AS admin_name,
  admin.is_active AS admin_active,admin.role AS assigned_role`;
const joins = `FROM internal_assistance_tickets t JOIN users creator ON creator.id=t.created_by
  LEFT JOIN users admin ON admin.id=t.assigned_to`;
async function actor(id, executor = pool, lock = false) {
  const [rows] = await query(executor, `SELECT id,role,desk_assignment,is_active,full_name FROM users WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0];
}
async function ticket(id, executor = pool, lock = false) {
  if (lock) await query(executor, 'SELECT id FROM internal_assistance_tickets WHERE id=? FOR UPDATE', [id]);
  const [rows] = await query(executor, `SELECT ${columns} ${joins} WHERE t.id=?`, [id]);
  return rows[0];
}
async function list(ownerId, filters, executor = pool) {
  const where = [], values = [];
  for (const [column, value] of [['created_by',ownerId],['state',filters.state],['category',filters.category]]) {
    if (value) { where.push(`t.${column}=?`); values.push(value); }
  }
  if (filters.before) { where.push('t.id<?'); values.push(filters.before); }
  const [rows] = await query(executor, `SELECT ${columns} ${joins} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.id DESC LIMIT 21`, values);
  return { tickets: rows.slice(0,20), next_cursor: rows.length > 20 ? rows[19].id : null };
}
async function create(actor, subject, category, executor) {
  const [row] = await query(executor, `INSERT INTO internal_assistance_tickets(created_by,creator_desk,subject,category,created_at,updated_at)
    VALUES (?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`, [actor.id,actor.desk_assignment,subject,category]);
  return row.insertId;
}
function update(id, values, executor) {
  const entries = Object.entries(values);
  if (entries.some(([key]) => !['state','assigned_to','claimed_at','resolved_at'].includes(key))) throw new Error('INVALID_INTERNAL_UPDATE');
  return query(executor, `UPDATE internal_assistance_tickets SET ${entries.map(([key]) => `${key}=?,`).join('')}version=version+1,updated_at=UTC_TIMESTAMP(3) WHERE id=?`, [...entries.map(([,value]) => value),id]);
}
async function message(ticketId, senderId, text, kind, executor) {
  const [row] = await query(executor, 'INSERT INTO internal_assistance_messages(ticket_id,sender_id,message,kind,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3))', [ticketId,senderId,text,kind]);
  return row.insertId;
}
async function prior(actorId, key, executor) {
  const [rows] = await query(executor, 'SELECT ticket_id,event_type,payload_hash,message_id FROM internal_assistance_events WHERE actor_id=? AND client_key=?', [actorId,key]);
  return rows[0];
}
function event(ticketId, actorId, type, key, hash, messageId, data, executor) {
  return query(executor, `INSERT INTO internal_assistance_events(ticket_id,actor_id,event_type,client_key,payload_hash,message_id,data,created_at)
    VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(3))`, [ticketId,actorId,type,key,hash,messageId,JSON.stringify(data)]);
}
async function history(id, before, executor = pool) {
  const [rows] = await query(executor, `SELECT m.id,m.ticket_id,m.sender_id,m.kind,m.message,m.created_at,u.full_name AS sender_name
    FROM internal_assistance_messages m LEFT JOIN users u ON u.id=m.sender_id
    WHERE m.ticket_id=? ${before ? 'AND m.id<?' : ''} ORDER BY m.id DESC LIMIT 51`, [id,...(before ? [before] : [])]);
  return { messages: rows.slice(0,50).reverse(), next_cursor: rows.length > 50 ? rows[49].id : null };
}
async function admins(executor = pool) {
  const [rows] = await query(executor, "SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
  return rows;
}
module.exports = { actor,ticket,list,create,update,message,prior,event,history,admins };
