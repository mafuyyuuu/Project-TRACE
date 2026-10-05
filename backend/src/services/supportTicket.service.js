const crypto = require('crypto');
const model = require('../models/supportTicket.model');
const documents = require('../models/document.model');
const access = require('./documents.service');
const notifications = require('./notification.service');
const { pool } = require('../config/db');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const { isCaseReadOnly, assertCaseWritable } = require('../utils/supportCase');
const { liveWindow, serviceMilliseconds, validateSettings } = require('../utils/supportHours');
const managed = actor => actor.role === 'admin' || (actor.role === 'clerk' && ['Window 1','Receiving Desk'].includes(actor.desk_assignment));
const windowClerk = actor => actor.role === 'clerk' && ['Window 1','Receiving Desk'].includes(actor.desk_assignment);
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
function id(value) { const number = Number(value); if (!Number.isSafeInteger(number) || number < 1) throw badRequest('Choose a valid ticket or case.'); return number; }
function cursor(value) { return value === undefined || value === null || value === '' ? null : id(value); }
function key(value) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(value)) throw badRequest('A valid retry key is required. Refresh and try again.'); return value; }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
async function currentActor(user, executor = pool) {
  const actor = await model.actor(user.id, executor);
  if (!actor?.is_active || actor.role !== user.role) throw forbidden('This account cannot access support.');
  if (actor.role !== 'student' && !managed(actor) && !(actor.role === 'clerk' && ['Secretary','Finance'].includes(actor.desk_assignment))) throw forbidden('This desk cannot access support.');
  return actor;
}
async function authorize(actor, ticket, executor = pool) {
  if (!ticket) throw notFound('Support ticket not found.');
  if (actor.role === 'student') {
    if (ticket.student_user_id !== actor.id) throw forbidden('You can only access your own support tickets.');
  } else if (!managed(actor)) {
    if (ticket.category !== 'linked') throw forbidden('General support is handled by Window 1.');
    await access.authorizeMessage(actor, { student_id: ticket.student_id }, executor);
  }
  return ticket;
}
const readOnly = ticket => ticket.state === 'RESOLVED' || (ticket.category === 'linked' && (!ticket.document_id || isCaseReadOnly(ticket.current_status)));
function writable(ticket) { if (ticket.category === 'linked' && !ticket.document_id) throw badRequest('This document case was cancelled. History is read-only.'); if (ticket.document_id) assertCaseWritable(ticket.current_status); if (ticket.state === 'RESOLVED') throw badRequest('This ticket is resolved. Reopen it before sending.'); }
async function transaction(user, work, serialize = false) {
  for (let attempt = 0; ; attempt++) {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const settings = await model.settings(connection, serialize);
    const actor = await currentActor(user, connection);
    await model.actor(actor.id,connection,true);
    const result = await work(connection, actor, settings);
    await connection.commit(); return result;
  } catch (error) {
    await connection.rollback();
    if (attempt >= 2 || !['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw error;
  }
  finally { connection.release(); }
  }
}
async function changed(ticketId, ownerId, text) {
  try {
    const desks = require('../models/documentMessage.model');
    const recipients = [{ id: ownerId }, ...await desks.window1Recipients()];
    await notifications.notifyInAppBulk(recipients, { title: 'Support updated', message: text, type: 'info', actionUrl: `/dashboard?tab=messages&ticket=${ticketId}` });
  } catch { /* Accepted writes survive notification failures. */ }
}
async function scope(actor) {
  if (actor.role === 'student') return ['t.student_user_id=?',[actor.id]];
  if (managed(actor)) return ['1=1',[]];
  if (actor.desk_assignment === 'Finance') return ["t.category='linked'",[]];
  const filter = await access.messageScope(actor);
  return [`t.category='linked' AND ${filter.conditions.join(' AND ').replaceAll('student.', 'u.')}`,filter.params];
}
async function list(user, query = {}) {
  const actor = await currentActor(user);
  const [where,params] = await scope(actor);
  const result = await model.list(where,params,cursor(query.before));
  return { ...result,tickets:result.tickets.map(ticket => ({ ...ticket,read_only:Boolean(readOnly(ticket)) })) };
}
async function resolveContext(user,query = {}) {
  const actor=await currentActor(user);
  let documentId=null, ownerId=null;
  if(query.document_id) {
    documentId=id(query.document_id);
    const [doc]=await documents.findById(documentId);
    if(!doc) throw notFound('Document case not found.');
    await access.authorizeMessage(actor,doc);
  } else {
    ownerId=query.student_user_id ? id(query.student_user_id) : actor.id;
    if(actor.role==='student' && ownerId!==actor.id || actor.role!=='student' && !managed(actor)) throw forbidden('General support is handled by Window 1.');
  }
  const found=await model.context(documentId,ownerId);
  return {ticket:found ? await authorize(actor,await model.ticket(found.id)) : null};
}
async function read(user, ticketId, query = {}) {
  const actor = await currentActor(user);
  const ticket = await authorize(actor, await model.ticket(id(ticketId)));
  const settings = await model.settings();
  const queue = await queueStatus(ticket,settings);
  const history = await model.history(ticket.id,cursor(query.before));
  const requirements = ticket.document_id && history.messages.some(message => message.kind==='requirement') ? await require('../models/requestAttachment.model').list(ticket.document_id) : [];
  history.messages = history.messages.map(message => message.kind==='requirement' ? {...message,requirement:requirements.find(row => row.id===Number(message.metadata?.requirement_id)) || message.metadata?.snapshot} : message);
  return { queue,ticket:{ ...ticket,read_only:Boolean(readOnly(ticket)) },...history, window:liveWindow(new Date(),settings) };
}
async function create(user, body = {}) {
  const documentId = body.document_id ? id(body.document_id) : null;
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  if (!subject || subject.length > 255) throw badRequest('Enter a ticket subject of 1–255 characters.');
  const retryKey = key(body.client_key), hash = digest({ documentId,subject });
  return transaction(user,async (connection,actor,settings) => {
    if (actor.role !== 'student' && !documentId) throw forbidden('Staff may open authorized linked cases; students create general tickets.');
    const prior = await model.eventExists(`${actor.id}:${retryKey}`,connection);
    if (prior) { const data = parse(prior.data); if (data?.hash !== hash || prior.event_type !== 'created') throw badRequest('This retry key belongs to a different action.'); return authorize(actor,await model.ticket(prior.ticket_id,connection),connection); }
    // Serialize general creation on the student row as well as the database unique key.
    await model.actor(actor.id,connection,true);
    let ownerId=actor.id;
    if (documentId) {
      if (actor.role==='student' && !actor.email_verified_at) throw forbidden('Verify your email in Profile before opening a document case ticket.');
      const [doc] = await documents.findByIdForUpdate(documentId,connection);
      if (!doc) throw notFound('Document case not found.');
      await access.authorizeMessage(actor,doc,connection); assertCaseWritable(doc.current_status);
      const owners=await require('../models/user.model').findStudentForPolicy(doc.student_id,connection);
      if(owners.length!==1) throw badRequest('The student ownership of this case requires Admin review.');
      ownerId=owners[0].id;
    }
    const existing = documentId ? await model.linked(documentId,connection) : await model.openGeneral(actor.id,connection);
    if (existing) return authorize(actor,await model.ticket(existing.id,connection),connection);
    const ticketId = await model.create(ownerId,documentId,subject,documentId ? 'linked' : 'general',connection);
    await model.event(ticketId,actor.id,'created',`${actor.id}:${retryKey}`,{hash,calendar:settings,...(actor.role!=='student' ? {via:'staff_opened_case'} : {})},connection);
    if(actor.role==='student') await model.system(ticketId,'Choose an approved FAQ topic or select Talk to staff.',{},connection);
    else {
      await model.update(ticketId,{state:'QUEUED',queued_at:new Date()},connection);
      await model.event(ticketId,actor.id,'escalated',crypto.randomUUID(),{via:'staff_opened_case'},connection);
      await model.system(ticketId,'Registrar opened support for this document case.',{},connection);
    }
    if(documentId) for(const row of await require('../models/requestAttachment.model').list(documentId,connection)) await require('../models/requestAttachment.model').bubble(row,connection);
    return model.ticket(ticketId,connection);
  });
}
async function send(user, ticketId, body = {}, files = []) {
  const text = typeof body?.message === 'string' ? body.message.trim() : '';
  if ((!text && !files.length) || text.length > 2000) throw badRequest('Enter a message up to 2000 characters or attach a file.');
  const retryKey = key(body.client_key), hash = digest({text,files:files.map(file => ({name:file.originalname,size:file.size,hash:file.content_hash}))});
  const result = await transaction(user,async (connection,actor,settings) => {
    const ticket = await authorize(actor,await model.ticket(id(ticketId),connection,true),connection);
    await model.actor(actor.id,connection,true);
    const prior = await model.priorSend(actor.id,retryKey,connection);
    if (prior) {
      if (prior.ticket_id !== ticket.id || prior.payload_hash !== hash) throw badRequest('This retry key belongs to another message.');
      const {payload_hash,client_key,import_key,...sent} = prior;
      return { ticket, sent:{...sent,files:await model.files([prior.id],connection)}, duplicate:true };
    }
    await settleTicket(ticket,connection,settings);
    writable(ticket);
    if (ticket.document_id) {
      if (actor.role === 'student' && !actor.email_verified_at) throw forbidden('Verify your email in Profile before sending document-case messages.');
      const [doc] = await documents.findByIdForUpdate(ticket.document_id,connection); assertCaseWritable(doc?.current_status);
    }
    if (windowClerk(actor) && (ticket.state !== 'IN_PROGRESS' || ticket.assigned_to !== actor.id)) throw forbidden('Claim this ticket before replying in the live queue.');
    if (windowClerk(actor) && !liveWindow(new Date(),settings).open) throw badRequest('Live support is paused outside working hours. Your assignment and conversation are preserved.');
    if (actor.role !== 'student' && ticket.state === 'FAQ_ASSISTANCE') throw badRequest('Escalate the ticket before a staff reply.');
    if (actor.role === 'student' && ticket.state === 'AWAITING_STUDENT') {
      await model.update(ticket.id,{state:'QUEUED',assigned_to:null,queued_at:new Date(),reply_requested_at:null,reply_clock:null,warned_at:null},connection);
      await model.event(ticket.id,actor.id,'requeued',crypto.randomUUID(),{reason:'student_return'},connection);
      await model.system(ticket.id,'Student returned; this ticket rejoined the queue.',{},connection);
    } else if (actor.role === 'student' && ticket.reply_requested_at) {
      await model.event(ticket.id,actor.id,'student_reply',crypto.randomUUID(),{service_ms:serviceMilliseconds(ticket.reply_requested_at,new Date(),parse(ticket.reply_clock)||settings)},connection);
      await model.update(ticket.id,{reply_requested_at:null,reply_clock:null,warned_at:null},connection);
    }
    const messageId = await model.send(ticket.id,actor.id,text,retryKey,hash,connection);
    for (const file of files) await model.file(messageId,file,connection);
    await model.event(ticket.id,actor.id,actor.role === 'student' ? 'student_message' : 'staff_message',crypto.randomUUID(),{message_id:messageId,calendar:settings},connection);
    if (actor.role === 'student' && /\b(human|live support|talk to staff)\b/i.test(text) && ticket.state === 'FAQ_ASSISTANCE') {
      await model.update(ticket.id,{state:'QUEUED',queued_at:new Date()},connection);
      await model.event(ticket.id,actor.id,'escalated',crypto.randomUUID(),{via:'explicit_phrase',calendar:settings},connection);
      await model.system(ticket.id,'Sent to the Registrar queue. Your conversation is preserved.',{},connection);
    }
    return {ticket,sent:{id:messageId,ticket_id:ticket.id,sender_id:actor.id,sender_name:actor.full_name,message:text,created_at:new Date().toISOString(),files:await model.files([messageId],connection)},duplicate:false};
  });
  if (!result.duplicate) await changed(result.ticket.id,result.ticket.student_user_id,'A new support message is available.');
  return result;
}
async function action(user,ticketId,body = {}) {
  const retryKey = key(body?.client_key), action = body.action;
  const allowed = ['escalate','resolve','reopen','await_student','request_reply'];
  if (!allowed.includes(action)) throw badRequest('Choose a valid support action.');
  const hash = digest({ticketId:id(ticketId),action});
  const result = await transaction(user,async (connection,actor,settings) => {
    const ticket = await authorize(actor,await model.ticket(id(ticketId),connection,true),connection);
    await settleTicket(ticket,connection,settings);
    const prior = await model.eventExists(`${actor.id}:${retryKey}`,connection);
    if (prior) { if (parse(prior.data)?.hash !== hash) throw badRequest('This retry key belongs to another action.'); return ticket; }
    if (actor.role === 'clerk' && actor.desk_assignment === 'Finance') throw forbidden('Finance can message linked tickets but cannot manage their lifecycle.');
    if (ticket.category === 'linked' && !ticket.document_id) throw badRequest('This cancelled case is read-only.');
    if (ticket.document_id) {
      if (actor.role === 'student' && !actor.email_verified_at) throw forbidden('Verify your email in Profile before changing a document-case ticket.');
      const [doc] = await documents.findByIdForUpdate(ticket.document_id,connection); assertCaseWritable(doc?.current_status);
    }
    const registrar = managed(actor) || actor.desk_assignment === 'Secretary';
    if (['await_student','request_reply'].includes(action) && (!registrar || ticket.state !== 'IN_PROGRESS')) throw forbidden('Only an authorized Registrar desk can request a reply on a live ticket.');
    if (['await_student','request_reply'].includes(action) && windowClerk(actor) && ticket.assigned_to !== actor.id) throw forbidden('Only the assigned clerk may manage this live reply window.');
    if (action === 'resolve' && !registrar && !(actor.role === 'student' && ticket.state === 'FAQ_ASSISTANCE')) throw forbidden('Only Registrar staff resolve an escalated ticket.');
    if (action === 'reopen') {
      if (ticket.state !== 'RESOLVED') throw badRequest('This ticket is already open.');
      if (!ticket.document_id) { const other = await model.openGeneral(ticket.student_user_id,connection); if (other) throw badRequest('Use your existing unresolved general ticket before reopening this one.'); }
    } else writable(ticket);
    if (action === 'escalate' && ticket.state !== 'FAQ_ASSISTANCE') throw badRequest('This ticket has already been escalated.');
    const now = new Date();
    const values = action === 'request_reply' ? {reply_requested_at:now,reply_clock:settings,warned_at:null}
      : {state: action === 'resolve' ? 'RESOLVED' : action === 'await_student' ? 'AWAITING_STUDENT' : 'QUEUED',assigned_to:null,reply_requested_at:null,reply_clock:null,warned_at:null,resolved_at:action === 'resolve' ? now : null,...(['reopen','escalate'].includes(action) ? {queued_at:now} : {})};
    if (action === 'request_reply' && ticket.reply_requested_at) throw badRequest('A reply is already requested; the timer will not restart.');
    await model.update(ticket.id,values,connection);
    await model.event(ticket.id,actor.id,action === 'escalate' ? 'escalated' : action,`${actor.id}:${retryKey}`,{hash,calendar:settings,previous_state:ticket.state},connection);
    await model.system(ticket.id,{escalate:'Sent to the Registrar queue.',resolve:'Ticket resolved.',reopen:'Ticket reopened at the queue tail.',await_student:'Awaiting student; the live staff slot is free.',request_reply:`Please reply. Warning at ${settings.warning_minutes} service minutes; timeout at ${settings.timeout_minutes}. The clock pauses outside support hours.`}[action],{},connection);
    return model.ticket(ticket.id,connection);
  });
  await changed(result.id,result.student_user_id,'Your support ticket state changed.'); return result;
}
async function setAvailability(user,body) {
  if (typeof body.available !== 'boolean') throw badRequest('Choose available or unavailable.');
  return transaction(user,async (connection,actor) => {
    if (!windowClerk(actor)) throw forbidden('Only Window 1 clerks control live availability.');
    await model.availability(actor.id,body.available,connection);
    await model.event(null,actor.id,'availability',crypto.randomUUID(),{available:body.available},connection);
    return {available:body.available};
  });
}
async function claim(user) {
  let didClaim=false;
  const result=await transaction(user,async (connection,actor,settings) => {
    didClaim=false;
    if (!windowClerk(actor)) throw forbidden('Only Window 1 clerks claim the live queue.');
    const own = await model.currentAssignment(actor.id,connection);
    if (own) return model.ticket(own.id,connection);
    if (!liveWindow(new Date(),settings).open) throw badRequest('Live support is closed. Queued tickets are preserved.');
    if (!await model.available(actor.id,connection)) throw badRequest('Declare yourself available before claiming a ticket.');
    const oldest = await model.oldest(connection);
    if (!oldest) return {ticket:null};
    const ticket = await model.ticket(oldest.id,connection,true);
    await model.update(ticket.id,{state:'IN_PROGRESS',assigned_to:actor.id,claimed_at:new Date()},connection);
    await model.event(ticket.id,actor.id,'claimed',crypto.randomUUID(),{queued_at:ticket.queued_at,calendar:settings},connection);
    await model.system(ticket.id,'A Window 1 clerk is now handling this ticket.',{},connection);
    didClaim=true;
    return model.ticket(ticket.id,connection);
  },true);
  if(didClaim && result?.id) await changed(result.id,result.student_user_id,'A Window 1 clerk is handling your support ticket.');
  return result;
}
async function getSettings(user) { const actor = await currentActor(user); return {settings:await model.settings(),can_manage:managed(actor),available:windowClerk(actor) ? await model.available(actor.id,pool) : false}; }
async function saveSettings(user,body) {
  const settings = validateSettings(body);
  return transaction(user,async (connection,actor) => {
    if (!managed(actor)) throw forbidden('Admin or Window 1 manages support settings.');
    await model.saveSettings(settings,actor.id,connection);
    await model.event(null,actor.id,'settings_changed',crypto.randomUUID(),settings,connection);
    return {settings};
  },true);
}
async function settleTicket(ticket,connection,settings,now = new Date()) {
  if (ticket.state !== 'IN_PROGRESS' || !ticket.reply_requested_at) return;
  const clock = parse(ticket.reply_clock) || settings;
  const elapsed = serviceMilliseconds(ticket.reply_requested_at,now,clock);
  if (elapsed >= clock.timeout_minutes * 60000) {
    await model.update(ticket.id,{state:'AWAITING_STUDENT',assigned_to:null,reply_requested_at:null,reply_clock:null,warned_at:null},connection);
    await model.event(ticket.id,null,'response_timeout',crypto.randomUUID(),{service_ms:elapsed,calendar:clock},connection);
    await model.system(ticket.id,'Awaiting student: the reply window expired. Reply to rejoin the queue without losing this conversation.',{},connection);
    Object.assign(ticket,{state:'AWAITING_STUDENT',assigned_to:null,reply_requested_at:null,reply_clock:null,warned_at:null});
  } else if (elapsed >= clock.warning_minutes * 60000 && !ticket.warned_at) {
    await model.update(ticket.id,{warned_at:now},connection);
    await model.event(ticket.id,null,'response_warning',crypto.randomUUID(),{service_ms:elapsed,calendar:clock},connection);
    await model.system(ticket.id,`Please reply before ${clock.timeout_minutes} service minutes to keep this live conversation. The clock pauses outside support hours.`,{},connection);
    ticket.warned_at = now;
  }
}
async function processTimers() {
  let after = 0;
  for (;;) {
    const connection = await pool.getConnection(), changedTickets = [];
    let rows;
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();
      const settings = await model.settings(connection,true);
      rows = await model.timers(connection,after);
      for (const row of rows) {
        const ticket = await model.ticket(row.id,connection,true);
        if (!ticket) continue;
        const before = `${ticket.state}:${ticket.warned_at}`;
        await settleTicket(ticket,connection,settings);
        if (before !== `${ticket.state}:${ticket.warned_at}`) changedTickets.push(ticket);
      }
      await connection.commit();
    } catch(error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    await Promise.allSettled(changedTickets.map(ticket => changed(ticket.id,ticket.student_user_id,'Check your support reply window and queue state.')));
    if (rows.length < 100) break;
    after = rows[rows.length - 1].id;
  }
}
async function queueStatus(ticket,settings) {
  if(readOnly(ticket)) return {position:null,available_clerks:0,wait_range_minutes:null,message:'Read-only history'};
  const {position,available_clerks,episodes} = await model.queueInfo(ticket);
  const samples=[], starts=new Map();
  for(const event of episodes) {
    if(event.event_type==='claimed') starts.set(event.ticket_id,event);
    else if(starts.has(event.ticket_id)) {
      const start=starts.get(event.ticket_id),calendar=parse(start.data)?.calendar;
      if(calendar) { const ms=serviceMilliseconds(start.created_at,event.created_at,calendar); if(ms>0)samples.push(ms/60000); }
      starts.delete(event.ticket_id);
    }
  }
  samples.sort((a,b)=>a-b);
  const open=liveWindow(new Date(),settings).open;
  const sufficient=open && position && available_clerks>0 && position>available_clerks && samples.length>=10;
  const rounds=position ? Math.max(0,Math.ceil(position/Math.max(1,available_clerks))-1) : 0;
  const wait_range_minutes=sufficient ? [Math.floor(samples[Math.floor((samples.length-1)*0.25)]*rounds),Math.ceil(samples[Math.ceil((samples.length-1)*0.90)]*rounds)] : null;
  return {position,available_clerks,wait_range_minutes,sample_size:samples.length,message:!open ? 'Live support is closed; your queue place is saved.' : wait_range_minutes ? 'Estimated wait; availability can change.' : 'Waiting for available staff'};
}
async function assertSendAccess(user,ticketId) {
  const actor=await currentActor(user), ticket=await authorize(actor,await model.ticket(id(ticketId)));
  // Authorize before accepting multipart bytes. The transaction checks writable
  // state after checking its retry key, so a previously accepted send can be
  // acknowledged after resolution. Failed/new uploads are cleaned up.
  if (ticket.document_id && actor.role === 'student' && !actor.email_verified_at) throw forbidden('Verify your email in Profile before sending document-case messages.');
  return ticket;
}
async function assertFileRead(user,filename) {
  const file = await model.fileOwner(filename);
  if (!file) throw notFound('Support attachment not found.');
  await authorize(await currentActor(user),await model.ticket(file.ticket_id)); return file;
}
module.exports = { list,resolveContext,read,create,send,action,claim,setAvailability,getSettings,saveSettings,assertFileRead,assertSendAccess,queueStatus,settleTicket,processTimers,authorize,currentActor,managed,readOnly,transaction,changed };

async function requirementHistory(user, ticketId, requirementId, before) {
  const actor = await currentActor(user);
  const ticket = await authorize(actor,await model.ticket(id(ticketId)));
  const raw = await model.requirementMessage(ticket.id,id(requirementId));
  const metadata = raw ? parse(raw) : null;
  if (!metadata?.document_id) throw notFound('Requirement not found in this ticket.');
  return require('../models/requestAttachment.model').history(requirementId,metadata.document_id,before);
}
module.exports.requirementHistory = requirementHistory;
