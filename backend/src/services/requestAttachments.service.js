const model = require('../models/requestAttachment.model');
const documents = require('../models/document.model');
const log = require('../models/stepLog.model');
const access = require('./documents.service');
const { pool } = require('../config/db');
const { forbidden, badRequest, notFound } = require('../utils/AppError');
function registrar(user) {
  if (user.role !== 'admin' && !(user.role === 'clerk' && ['Window 1', 'Receiving Desk', 'Secretary'].includes(user.desk_assignment))) throw forbidden('Only Registrar staff can request or review pertinent documents.');
}
async function list(user, documentId) {
  const [doc] = await documents.findById(documentId);
  if (!doc) throw notFound('Request not found.');
  await access.authorizeMessage(user, doc);
  return { requirements: await model.list(documentId) };
}
async function mutate(user, documentId, kind, requirementId, body = {}, file) {
  if (!['request', 'upload', 'review'].includes(kind)) throw badRequest('Unknown attachment action.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Invalid attachment details.');
  if (kind !== 'upload' || user.role !== 'student') registrar(user);
  if (kind === 'request' && (typeof body.label !== 'string' || !body.label.trim() || body.label.trim().length > 255 || typeof body.instructions !== 'string' || !body.instructions.trim() || body.instructions.trim().length > 2000)) throw badRequest('Name the required document and give instructions (up to 255 and 2000 characters).');
  if (kind === 'review' && (!['accept', 'resubmit'].includes(body.action) || (body.notes !== undefined && typeof body.notes !== 'string') || (body.notes || '').length > 2000 || (body.action === 'resubmit' && !(body.notes || '').trim()))) throw badRequest('Choose Accept or Request resubmission, with a reason for resubmission.');
  if (kind === 'upload' && !file) throw badRequest('Choose the pertinent document to upload.');
  const connection = await pool.getConnection();
  let doc;
  try {
    await connection.beginTransaction();
    [doc] = await documents.findByIdForUpdate(documentId, connection);
    if (!doc) throw notFound('Request not found.');
    await access.authorizeMessage(user, doc, connection);
    if (kind === 'request') {
      if ((await model.list(documentId, connection)).length >= 20) throw badRequest('This request already has 20 attachment requirements. Review existing requirements first.');
      await model.create(documentId, user.id, body.label.trim(), body.instructions.trim(), connection);
    } else {
      const row = await model.lock(requirementId, documentId, connection);
      if (!row) throw notFound('Attachment requirement not found on this request.');
      if (kind === 'upload') {
        if (row.status !== 'requested') throw badRequest('This attachment is already submitted. Wait for Registrar review.');
        await model.upload(row.id, user.id, file, connection); await model.markUploaded(row.id, connection);
      } else {
        if (row.status !== 'uploaded') throw badRequest('Wait for the requested document to be uploaded before reviewing it.');
        await model.review(row.id, user.id, body.action, body.notes, connection);
      }
    }
    await log.insert({ document_id: doc.id, clerk_id: user.role === 'student' ? null : user.id,
      action_taken: `attachment_${kind}`, from_status: doc.current_status, to_status: doc.current_status,
      notes: kind === 'request' ? `${body.label.trim()}: ${body.instructions.trim()}` : kind === 'review' ? `${body.action}: ${body.notes || 'Document inspected.'}` : `Required attachment uploaded by account ${user.id}.`,
    }, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  try {
    const users = require('../models/user.model');
    const messages = require('../models/documentMessage.model');
    const notifications = require('./notification.service');
    const recipients = user.role === 'student' ? await messages.window1Recipients() : await users.findStudentContactByStudentId(doc.student_id);
    await notifications.notifyInAppBulk(recipients, { title: kind === 'request' ? 'Additional documents requested' : kind === 'upload' ? 'Pertinent document submitted' : 'Attachment review updated', message: `Check Attachments for request ${doc.tracking_number}.`, type: 'info', actionUrl: `/dashboard?tab=messages&document=${doc.id}` });
  } catch { console.warn('Attachment saved; notification could not be delivered.'); }
  return { message: 'Attachment requirement updated.' };
}
module.exports = { list, mutate };
