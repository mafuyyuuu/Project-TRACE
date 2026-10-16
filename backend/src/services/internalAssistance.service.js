const { ticketArchiveView } = require('../utils/ticketArchive');
const crypto = require('crypto');
const model = require('../models/internalAssistance.model');
const { pool } = require('../config/db');
const { badRequest,forbidden,notFound,AppError } = require('../utils/AppError');
const notifications = require('./notification.service');
const categories = { account_access:'Account access',system_issue:'System issue',workflow_question:'Workflow question',other:'Other concern' };
const states = ['QUEUED','IN_PROGRESS','AWAITING_STAFF','RESOLVED'];
const eligible = actor => actor?.role === 'admin' || (actor?.role === 'clerk' && ['Window 1','Receiving Desk','Secretary','Finance'].includes(actor.desk_assignment));
function id(value) { const number = Number(value); if (!Number.isSafeInteger(number) || number < 1) throw badRequest('Choose a valid internal ticket.'); return number; }
function key(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(value)) throw badRequest('A valid retry key is required.'); return value; }
function text(value, max, label) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw badRequest(`${label} must contain 1–${max} characters.`); return value.trim(); }
function details(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Enter valid internal assistance details.'); return body; }
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function actor(user, executor = pool, lock = false) {
  const current = await model.actor(user.id,executor,lock);
  if (!current?.is_active || current.role !== user.role || !eligible(current)) throw forbidden('Internal assistance is available only to authorized staff and Admin.');
  return current;
}
function authorize(current, ticket) {
  if (!ticket) throw notFound('Internal ticket not found.');
  if (current.role !== 'admin' && Number(ticket.created_by) !== Number(current.id)) throw forbidden('You can only access your own internal tickets.');
  return ticket;
}
const assigned = (current,ticket) => current.role === 'admin' && Number(ticket.assigned_to) === Number(current.id);
const claimable = ticket => ticket.state !== 'RESOLVED' && (!ticket.assigned_to || !ticket.admin_active || ticket.assigned_role !== 'admin');
function present(current,ticket) {
  return { ...ticket, can_claim:current.role === 'admin' && claimable(ticket),
    can_send:ticket.state !== 'RESOLVED' && (current.role !== 'admin' || assigned(current,ticket)),
    can_manage:assigned(current,ticket),can_reopen:ticket.state === 'RESOLVED' && (current.role !== 'admin' || assigned(current,ticket)) };
}
async function transaction(user, work) {
  for (let attempt = 0; ; attempt++) {
    const connection = await pool.getConnection();
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();
      // One lock per actor serializes cross-ticket retry keys; the ticket lock
      // arbitrates different Admins claiming/managing the same ticket.
      const current = await actor(user,connection,true);
      const result = await work(connection,current);
      await connection.commit(); return result;
    } catch (error) {
      await connection.rollback();
      if (attempt >= 2 || !['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw error;
    } finally { connection.release(); }
  }
}
async function notify(ticket,current) {
  try {
    const recipients = current.role === 'admin' ? [{id:ticket.created_by}]
      : ticket.assigned_to && ticket.admin_active && ticket.assigned_role === 'admin' ? [{id:ticket.assigned_to}] : await model.admins();
    await notifications.notifyInAppBulk(recipients.filter(row => Number(row.id) !== Number(current.id)), {
      title:'Internal assistance updated',message:`Internal ticket #${ticket.id} has an update.`,type:'info',
      actionUrl:`/dashboard?tab=internal-assistance&internalTicket=${ticket.id}`,
    });
  } catch { /* A committed action survives failed private notifications. */ }
}
function replay(prior, ticketId, type, hash) {
  if (!prior) return false;
  if ((ticketId && Number(prior.ticket_id) !== ticketId) || prior.event_type !== type || prior.payload_hash !== hash) throw badRequest('This retry key belongs to another action.');
  return true;
}
async function list(user,query = {}) {
  const current = await actor(user);
  if (query.state && !states.includes(query.state) || query.category && !Object.hasOwn(categories,query.category)) throw badRequest('Choose a valid internal ticket filter.');
  const result = await model.list(current.role === 'admin' ? null : current.id,{view:ticketArchiveView(query.view),state:query.state,category:query.category,before:query.before ? id(query.before) : null});
  return { ...result,tickets:result.tickets.map(ticket => present(current,ticket)),categories,states };
}
async function read(user,ticketId,query = {}) {
  const current = await actor(user), ticket = authorize(current,await model.ticket(id(ticketId)));
  return {ticket:present(current,ticket),...await model.history(ticket.id,query.before ? id(query.before) : null)};
}
async function create(user,body = {}) {
  body = details(body);
  const subject = text(body.subject,255,'Subject'), description = text(body.description,2000,'Concern');
  if (!Object.hasOwn(categories,body.category)) throw badRequest('Choose a concern category.');
  const retryKey = key(body.client_key), hash = digest({subject,description,category:body.category});
  const result = await transaction(user,async(connection,current) => {
    if (current.role === 'admin') throw forbidden('Desk staff create internal concerns; Admin handles the queue.');
    const prior = await model.prior(current.id,retryKey,connection);
    if (replay(prior,null,'created',hash)) return {ticket:present(current,authorize(current,await model.ticket(prior.ticket_id,connection))),duplicate:true};
    const ticketId = await model.create(current,subject,body.category,connection);
    const messageId = await model.message(ticketId,current.id,description,'message',connection);
    await model.event(ticketId,current.id,'created',retryKey,hash,messageId,{state:'QUEUED'},connection);
    return {ticket:present(current,await model.ticket(ticketId,connection)),current,duplicate:false};
  });
  if (!result.duplicate) await notify(result.ticket,result.current);
  return {ticket:result.ticket,duplicate:result.duplicate};
}
async function send(user,ticketId,body = {}) {
  body = details(body);
  const ticketNumber = id(ticketId), message = text(body.message,2000,'Message'), retryKey = key(body.client_key);
  const hash = digest({ticketId:ticketNumber,message});
  const result = await transaction(user,async(connection,current) => {
    const ticket = authorize(current,await model.ticket(ticketNumber,connection,true));
    const prior = await model.prior(current.id,retryKey,connection);
    if (replay(prior,ticketNumber,'message',hash)) return {duplicate:true,message_id:prior.message_id};
    if (ticket.state === 'RESOLVED') throw badRequest('Reopen this internal ticket before sending.');
    if (current.role === 'admin' && !assigned(current,ticket)) throw forbidden('Claim this internal ticket before replying.');
    const messageId = await model.message(ticket.id,current.id,message,'message',connection);
    const returning = current.role !== 'admin' && ticket.state === 'AWAITING_STAFF';
    await model.update(ticket.id,returning ? {state:'IN_PROGRESS'} : {},connection);
    if (returning) await model.message(ticket.id,null,'Staff replied; the assigned Admin can continue handling this concern.','system',connection);
    await model.event(ticket.id,current.id,'message',retryKey,hash,messageId,{previous_state:ticket.state,staff_return:returning},connection);
    return {ticket:await model.ticket(ticket.id,connection),current,duplicate:false,message_id:messageId};
  });
  if (!result.duplicate) await notify(result.ticket,result.current);
  return {sent:true,message_id:result.message_id,duplicate:result.duplicate};
}
async function action(user,ticketId,body = {}) {
  body = details(body);
  const ticketNumber = id(ticketId), retryKey = key(body.client_key), type = body.action;
  if (!['claim','await_staff','resume','resolve','reopen'].includes(type)) throw badRequest('Choose a valid internal assistance action.');
  const version = Number(body.version);
  if (body.version === undefined || body.version === null || body.version === '' || !Number.isSafeInteger(version) || version < 0) throw badRequest('Refresh the ticket before reviewing an action.');
  const note = type === 'resolve' ? text(body.note,2000,'Resolution note') : '';
  const hash = digest({ticketId:ticketNumber,type,version,note});
  const result = await transaction(user,async(connection,current) => {
    const ticket = authorize(current,await model.ticket(ticketNumber,connection,true));
    const prior = await model.prior(current.id,retryKey,connection);
    if (replay(prior,ticketNumber,type,hash)) return {ticket:present(current,ticket),duplicate:true};
    if (Number(ticket.version) !== version) throw new AppError('This ticket changed. Refresh it and review the action again.',409);
    if (type === 'claim') {
      if (current.role !== 'admin' || !claimable(ticket)) throw forbidden('Only Admin can claim an unassigned ticket or take over from an unavailable Admin.');
    } else if (type === 'reopen') {
      if (ticket.state !== 'RESOLVED' || (current.role === 'admin' && !assigned(current,ticket))) throw forbidden('Only the creator or assigned Admin can reopen a resolved concern.');
    } else {
      if (!assigned(current,ticket)) throw forbidden('Only the assigned Admin manages this internal ticket.');
      if (ticket.state === 'RESOLVED' || type === 'await_staff' && ticket.state !== 'IN_PROGRESS' || type === 'resume' && ticket.state !== 'AWAITING_STAFF') throw badRequest('This action is unavailable in the current ticket state.');
    }
    const now = new Date(), values = type === 'claim' ? {assigned_to:current.id,state:'IN_PROGRESS',claimed_at:now}
      : type === 'reopen' ? {state:'QUEUED',assigned_to:null,claimed_at:null,resolved_at:null}
      : {state:type === 'resolve' ? 'RESOLVED' : type === 'await_staff' ? 'AWAITING_STAFF' : 'IN_PROGRESS',...(type === 'resolve' ? {resolved_at:now} : {})};
    await model.update(ticket.id,values,connection);
    const texts = {claim:`${current.full_name} is now the assigned Admin.`,await_staff:'Awaiting a reply from the staff creator. The Admin assignment is retained.',resume:'Admin resumed handling this concern.',resolve:`Resolved by ${current.full_name}.\n\n${note}`,reopen:'Ticket reopened in the internal queue. Previous resolution history is retained.'};
    const messageId = await model.message(ticket.id,null,texts[type],'system',connection);
    await model.event(ticket.id,current.id,type,retryKey,hash,messageId,{previous_state:ticket.state,previous_assignee:ticket.assigned_to,new_state:values.state,note},connection);
    return {ticket:present(current,await model.ticket(ticket.id,connection)),current,duplicate:false};
  });
  if (!result.duplicate) await notify(result.ticket,result.current);
  return {ticket:result.ticket,duplicate:result.duplicate};
}
module.exports = { list,read,create,send,action };
