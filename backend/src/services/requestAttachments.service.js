const model = require('../models/requestAttachment.model');
const documents = require('../models/document.model');
const log = require('../models/stepLog.model');
const access = require('./documents.service');
const { pool } = require('../config/db');
const { forbidden, badRequest, notFound } = require('../utils/AppError');
const { assertCaseWritable } = require('../utils/supportCase');
const catalog = require('../models/supportingDocument.model');
const tickets = require('./supportTicket.service');
function registrar(user) {
  if (user.role !== 'admin' && !(user.role === 'clerk' && ['Window 1', 'Receiving Desk', 'Secretary'].includes(user.desk_assignment))) throw forbidden('Only Registrar staff can request or review pertinent documents.');
}
async function list(user, documentId) {
  user = await tickets.currentActor(user);
  const [doc] = await documents.findById(documentId);
  if (!doc) throw notFound('Request not found.');
  await access.authorizeMessage(user, doc);
  return { requirements: await model.list(documentId), types:(await catalog.list()).filter(row => row.is_active), read_only:require('../utils/supportCase').isCaseReadOnly(doc.current_status) };
}
async function mutate(user, documentId, kind, requirementId, body = {}, file) {
  if (!['request', 'upload', 'review'].includes(kind)) throw badRequest('Unknown attachment action.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Invalid attachment details.');
  if (kind !== 'upload' || user.role !== 'student') registrar(user);
  if (kind === 'request' && (typeof body.instructions !== 'string' || !body.instructions.trim() || body.instructions.trim().length > 2000 || !Number.isSafeInteger(Number(body.catalog_id)) || Number(body.catalog_id)<1)) throw badRequest('Choose an approved supporting-document type and give instructions (up to 2000 characters).');
  if (kind === 'review' && (!['accept', 'resubmit'].includes(body.action) || (body.notes !== undefined && typeof body.notes !== 'string') || (body.notes || '').length > 2000 || (body.action === 'resubmit' && !(body.notes || '').trim()))) throw badRequest('Choose Accept or Request resubmission, with a reason for resubmission.');
  if (kind === 'upload' && !file) throw badRequest('Choose the pertinent document to upload.');
  let doc;
  for (let attempt = 0; ; attempt++) {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    user = await tickets.currentActor(user,connection);
    if (kind !== 'upload' || user.role !== 'student') registrar(user);
    [doc] = await documents.findByIdForUpdate(documentId, connection);
    if (!doc) throw notFound('Request not found.');
    await access.authorizeMessage(user, doc, connection);
    assertCaseWritable(doc.current_status);
    if (kind === 'request') {
      const type = await catalog.find(Number(body.catalog_id),connection);
      if (!type?.is_active) throw badRequest('Choose an active Registrar-approved document type.');
      const rows = await model.list(documentId, connection);
      if (rows.length>=100) throw badRequest('This case has reached its 100-requirement history limit. Contact Admin.');
      const identity = `catalog:${type.id}`;
      const previous = body.replacement_of ? await model.lock(Number(body.replacement_of),documentId,connection) : rows.find(row => row.identity_key===identity && !row.superseded_at && row.status==='rejected');
      if (body.replacement_of && (!previous || (previous.catalog_id && previous.identity_key!==identity) || previous.superseded_at)) throw badRequest('Choose the current requirement of this document type for replacement.');
      if(rows.some(row => row.identity_key===identity && !row.superseded_at && row.status!=='rejected' && row.id!==previous?.id)) throw badRequest('This document is already requested, submitted or accepted. Use explicit replacement with instructions.');
      if(previous) await model.supersede(previous.id,connection);
      const requirementId = await model.create(documentId,user.id,type.name,body.instructions.trim(),connection,{catalog_id:type.id,identity_key:identity,replacement_of:previous?.id});
      if(!await require('../models/supportTicket.model').linked(documentId,connection)) {
        const owners=await require('../models/user.model').findStudentForPolicy(doc.student_id,connection);
        if(owners.length!==1) throw badRequest('This case ownership requires Admin review.');
        const ticketModel=require('../models/supportTicket.model');
        const ticketId=await ticketModel.create(owners[0].id,documentId,`Supporting documents: ${doc.tracking_number}`,'linked',connection);
        await ticketModel.update(ticketId,{state:'QUEUED',queued_at:new Date()},connection);
        await ticketModel.event(ticketId,user.id,'created',require('crypto').randomUUID(),{via:'attachment_request',calendar:await ticketModel.settings(connection)},connection);
      }
      const row = {id:requirementId,document_id:documentId,label:type.name,instructions:body.instructions.trim(),status:'requested',requested_by:user.id,catalog_id:type.id,identity_key:identity,replacement_of:previous?.id || null};
      await model.event(row,user.id,previous ? 'replacement_requested' : 'requested',connection);
      await model.bubble(row,connection);
    } else {
      const row = await model.lock(requirementId, documentId, connection);
      if (!row) throw notFound('Attachment requirement not found on this request.');
      if (row.superseded_at) throw badRequest('This requirement has been replaced. Use the current requirement.');
      if (kind === 'upload') {
        if (user.role==='student' && !user.email_verified_at) throw forbidden('Verify your email in Profile before submitting case documents.');
        if (row.superseded_at || !['requested','rejected'].includes(row.status)) throw badRequest('This attachment is already submitted or replaced. Wait for Registrar review.');
        await model.upload(row.id, user.id, file, connection); await model.markUploaded(row.id, connection);
      } else {
        if (row.status !== 'uploaded') throw badRequest('Wait for the requested document to be uploaded before reviewing it.');
        await model.review(row.id, user.id, body.action, body.notes, connection);
      }
      const updated = {...row,status:kind==='upload' ? 'uploaded' : body.action==='accept' ? 'accepted' : 'rejected',...(kind==='upload' ? {file_path:`/uploads/${file.filename}`,original_filename:file.originalname,uploaded_by:user.id} : {reviewed_by:user.id,review_notes:body.notes || null})};
      await model.event(updated,user.id,kind==='upload' ? 'submitted' : body.action==='accept' ? 'accepted' : 'rejected',connection);
      await model.bubble(updated,connection);
    }
    await log.insert({ document_id: doc.id, clerk_id: user.role === 'student' ? null : user.id,
      action_taken: `attachment_${kind}`, from_status: doc.current_status, to_status: doc.current_status,
      notes: kind === 'request' ? `Supporting document ${body.catalog_id}: ${body.instructions.trim()}` : kind === 'review' ? `${body.action}: ${body.notes || 'Document inspected.'}` : `Required attachment uploaded by account ${user.id}.`,
    }, connection);
    await connection.commit();
    break;
  } catch (error) {
    await connection.rollback();
    if (attempt >= 2 || !['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw error;
  } finally { connection.release(); }
  }
  try {
    const users = require('../models/user.model');
    const messages = require('../models/documentMessage.model');
    const notifications = require('./notification.service');
    const recipients = user.role === 'student' ? await messages.window1Recipients() : await users.findStudentContactByStudentId(doc.student_id);
    await notifications.notifyInAppBulk(recipients, { title: kind === 'request' ? 'Additional documents requested' : kind === 'upload' ? 'Pertinent document submitted' : 'Attachment review updated', message: `Check Attachments for request ${doc.tracking_number}.`, type: 'info', actionUrl: `/dashboard?tab=messages&document=${doc.id}` });
  } catch { console.warn('Attachment saved; notification could not be delivered.'); }
  return { message: 'Attachment requirement updated.' };
}
async function history(user, documentId, requirementId, before) {
  user = await tickets.currentActor(user);
  const [doc] = await documents.findById(documentId);
  if (!doc) throw notFound('Request not found.');
  await access.authorizeMessage(user, doc);
  const rows = await model.list(documentId);
  if (!rows.some(row => Number(row.id) === Number(requirementId))) throw notFound('Requirement not found on this case.');
  return model.history(requirementId, documentId, before);
}
module.exports = { list, mutate, history };
