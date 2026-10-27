const reads = require('../models/conversationRead.model');
const crypto = require('crypto');
const model = require('../models/staffConversation.model');
const notifications = require('./notification.service');
const { pool } = require('../config/db');
const {badRequest,forbidden,notFound} = require('../utils/AppError');
const desks = ['Window 1','Receiving Desk','Finance','Secretary'];
const staff = row => row?.role === 'clerk' && desks.includes(row.desk_assignment);
const validStaff = row => staff(row) && Boolean(row.is_active) && (row.desk_assignment !== 'Secretary' || Boolean(row.resolved_college_id));
function id(value) {if (!['number','string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw badRequest('Choose a valid staff recipient or conversation.');return Number(value);}
const cursor = value => value === undefined || value === null || value === '' ? null : id(value);
function payload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length>2000) throw badRequest('Enter a staff message of 1–2000 characters.');
  if (typeof body.client_key !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(body.client_key)) throw badRequest('A valid message retry key is required.');
  return {message:body.message.trim(),key:body.client_key};
}
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validate(user,row,write = false) {
  if (!row?.is_active || row.role !== user.role || !(row.role === 'admin' || validStaff(row))) throw forbidden('Staff coordination requires an active authorized staff account and college assignment.');
  if (write && row.role === 'admin') throw forbidden('Admin monitors staff coordination read-only. Use Internal Assistance for Admin concerns.');return row;
}
async function actor(user,executor = pool) {return validate(user,(await model.actors([user.id],executor))[0]);}
function authorize(current,thread) {
  if (!thread) throw notFound('Staff conversation not found.');
  if (current.role !== 'admin' && ![Number(thread.participant_low),Number(thread.participant_high)].includes(Number(current.id))) throw forbidden('Only participants can access this staff conversation.');
  if (current.role !== 'admin' && current.desk_assignment === 'Secretary' && Number(thread.scope_college_id) !== Number(current.resolved_college_id)) throw forbidden('This conversation belongs to a different college assignment.');return thread;
}
function compatible(first,second) {
  return validStaff(first) && validStaff(second) && Number(first.id)!==Number(second.id) && !(first.desk_assignment==='Secretary' && second.desk_assignment==='Secretary' && Number(first.resolved_college_id)!==Number(second.resolved_college_id));
}
const parties = thread => [{id:thread.participant_low,full_name:thread.low_name,role:thread.low_role,desk_assignment:thread.low_desk,is_active:thread.low_active,resolved_college_id:thread.low_college_id},
  {id:thread.participant_high,full_name:thread.high_name,role:thread.high_role,desk_assignment:thread.high_desk,is_active:thread.high_active,resolved_college_id:thread.high_college_id}];
function canSend(current,thread) {
  const [first,second] = parties(thread);
  return current.role !== 'admin' && compatible(first,second) && [first,second].every(row => row.desk_assignment!=='Secretary' || Number(row.resolved_college_id)===Number(thread.scope_college_id));
}
function present(current,thread) {
  return {id:thread.id,unread_count:thread.unread_count || 0,scope_college_id:thread.scope_college_id,created_at:thread.created_at,updated_at:thread.updated_at,
    participants:parties(thread).map(row => ({id:row.id,full_name:row.full_name,desk_assignment:row.desk_assignment})),can_send:canSend(current,thread),monitor_only:current.role==='admin'};
}
async function transaction(user,ids,work) {
  for(let attempt=0;;attempt++) {
    const connection = await pool.getConnection();
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await connection.beginTransaction();
      // Sorted participant locks serialize pair creation and all per-actor retry keys.
      const rows = await model.actors([...ids,user.id],connection,true),current = validate(user,rows.find(row => Number(row.id)===Number(user.id)),true);
      const result = await work(connection,current,rows);await connection.commit();return result;
    } catch(error) {await connection.rollback();if (attempt>=2 || !['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw error;}
    finally {connection.release();}
  }
}
function replay(prior,type,hash,thread) {
  if (!prior) return false;
  if (prior.event_type!==type || prior.payload_hash!==hash || thread && Number(prior.conversation_id)!==thread) throw badRequest('This retry key belongs to another staff action.');return true;
}
async function notify(result) {
  if (result.duplicate) return;
  try {await notifications.notifyInAppBulk([{id:result.recipient}],{title:'Staff coordination updated',message:`Staff conversation #${result.conversation.id} has a new message.`,type:'info',actionUrl:`/dashboard?tab=messages&category=staff&conversation=${result.conversation.id}`});}catch { /* Committed messages survive notification delivery failures. */ }
}
async function recipients(user,query = {}) {
  const current = await actor(user);validate(user,current,true);
  if (query.search !== undefined && (typeof query.search!=='string' || query.search.length>255)) throw badRequest('Search staff by name or desk, up to 255 characters.');
  const result = await model.recipients(current,query.search?.trim() || '',cursor(query.before));
  return {...result,recipients:result.recipients.filter(row => compatible(current,row)).map(row => ({id:row.id,full_name:row.full_name,desk_assignment:row.desk_assignment,college_name:row.college_name}))};
}
async function list(user,query = {}) {
  const current = await actor(user),result = await model.list(current,cursor(query.before));
  return {...result,access_scope:`${current.role}:${current.desk_assignment || ''}:${current.resolved_college_id || 0}`,conversations:(await reads.withUnread('staff',current.id,result.conversations)).map(thread => present(current,authorize(current,thread)))};
}
async function markRead(user,threadId,body) {
  const current = await actor(user),resource = authorize(current,await model.conversation(id(threadId)));
  return reads.mark('staff',current.id,resource.id,body?.through);
}
async function read(user,threadId,query = {}) {
  const current = await actor(user),thread = authorize(current,await model.conversation(id(threadId)));
  return {conversation:present(current,thread),...await model.history(thread.id,cursor(query.before))};
}
async function open(user,body) {
  const input = payload(body),recipientId = id(body.recipient_id),hash = digest({recipientId,message:input.message});
  if (recipientId===Number(user.id)) throw badRequest('Choose another authorized staff account.');
  const result = await transaction(user,[recipientId],async(connection,current,rows) => {
    const prior = await model.prior(current.id,input.key,connection);
    if (replay(prior,'opened',hash)) return {conversation:present(current,authorize(current,await model.conversation(prior.conversation_id,connection))),message_id:prior.message_id,duplicate:true};
    const recipient = rows.find(row => Number(row.id)===recipientId);
    if (!compatible(current,recipient)) throw forbidden('This recipient is unavailable or outside your permitted staff/college scope.');
    const scope = current.desk_assignment==='Secretary' ? current.resolved_college_id : recipient.desk_assignment==='Secretary' ? recipient.resolved_college_id : 0;
    const [low,high] = [current.id,recipient.id].sort((a,b)=>a-b);
    const existing = await model.pair(low,high,scope,connection),threadId = existing?.id || await model.create(low,high,scope,connection);
    const messageId = await model.message(threadId,current.id,input.message,connection);
    await model.event(threadId,current.id,'opened',input.key,hash,messageId,connection);
    return {conversation:present(current,await model.conversation(threadId,connection)),message_id:messageId,recipient:recipient.id,duplicate:false};
  });await notify(result);return {conversation:result.conversation,message_id:result.message_id,duplicate:result.duplicate};
}
async function send(user,threadId,body) {
  const number = id(threadId),input = payload(body),hash = digest({threadId:number,message:input.message});
  const current = await actor(user);validate(user,current,true);
  const initial = authorize(current,await model.conversation(number));
  const result = await transaction(user,[initial.participant_low,initial.participant_high],async(connection,locked) => {
    const thread = authorize(locked,await model.conversation(number,connection,true)),prior = await model.prior(locked.id,input.key,connection);
    if (replay(prior,'message',hash,number)) return {conversation:present(locked,thread),message_id:prior.message_id,duplicate:true};
    if (!canSend(locked,thread)) throw forbidden('This conversation is read-only because a participant or college assignment is unavailable.');
    const messageId = await model.message(number,locked.id,input.message,connection);
    await model.event(number,locked.id,'message',input.key,hash,messageId,connection);
    return {conversation:present(locked,thread),message_id:messageId,recipient:Number(thread.participant_low)===Number(locked.id) ? thread.participant_high : thread.participant_low,duplicate:false};
  });await notify(result);return {message_id:result.message_id,duplicate:result.duplicate};
}
module.exports = { markRead,recipients,list,read,open,send};
