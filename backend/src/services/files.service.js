const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');
const documentModel = require('../models/document.model');
const userModel = require('../models/user.model');
const { badRequest, forbidden, notFound } = require('../utils/AppError');

/**
 * Controlled access to uploaded files (GCash receipts, scanned forms, ID
 * proofs). These were previously served by express.static with no auth at
 * all, which made every student's ID photo public to anyone who knew or
 * guessed a filename.
 */

/**
 * Reduce whatever the client sent to a bare filename inside UPLOAD_DIR, and
 * confirm the resolved path really is inside that directory — otherwise
 * `..%2F..%2Fetc/passwd` style input could escape the uploads folder.
 */
function resolveSafePath(requested) {
  const filename = path.basename(String(requested || ''));
  if (!filename || filename === '.' || filename === '..') {
    throw badRequest('Invalid filename.');
  }

  const fullPath = path.resolve(UPLOAD_DIR, filename);
  if (path.dirname(fullPath) !== path.resolve(UPLOAD_DIR)) {
    throw forbidden('Invalid file path.');
  }

  return { filename, fullPath };
}

/**
 * Registration proofs belong to their owner and Admin verification. Ordinary
 * desk documents retain their workflow scope; support attachments use ticket
 * permissions. Students may read only their own request files and avatar.
 */
async function assertCanRead(user, filename) {
  if (filename.startsWith('support-') || await require('../models/supportTicket.model').fileOwner(filename)) {
    await require('./supportTicket.service').assertFileRead(user,filename);
    return;
  }
  const proofOwners = await userModel.findByIdProofFilename(filename);
  if (proofOwners.length || filename.startsWith('id-proof-')) {
    if (user.role === 'admin' || proofOwners.some(row => Number(row.id) === Number(user.id))) return;
    throw forbidden('Registration proofs require owner or Admin access.');
  }
  const attachment = await require('../models/requestAttachment.model').fileOwner(filename);
  if (attachment) { await require('./documents.service').authorizeMessage(user, attachment); return; }
  if (user.role === 'admin') return;
  const avatars = await userModel.findByProfilePictureFilename(filename);
  if (avatars.length) {
    if (avatars.some(row => Number(row.id) === Number(user.id))) return;
    if (user.role === 'clerk' && ['Window 1', 'Receiving Desk', 'Secretary'].includes(user.desk_assignment)) {
      await require('./auth.service').lookupStudent(avatars[0].student_id, user); return;
    }
    throw forbidden('You do not have access to this avatar.');
  }
  const docs = await documentModel.findByAttachedFilename(filename);
  if (!docs.length) throw forbidden('You do not have access to this file.');
  if (user.role === 'clerk' && user.desk_assignment === 'Finance'
    && ![docs[0].receipt_image_path, docs[0].official_receipt_path].some(value => value && path.basename(value) === filename)) {
    throw forbidden('Finance can access payment evidence only.');
  }
  await require('./documents.service').authorizeMessage(user, docs[0]);

}

/**
 * Returns the absolute path to send, after authorization and existence checks.
 */
async function getFilePathForUser(user, requestedName) {
  const { filename, fullPath } = resolveSafePath(requestedName);

  await assertCanRead(user, filename);

  if (!fs.existsSync(fullPath)) {
    throw notFound('File not found.');
  }

  return fullPath;
}

module.exports = { getFilePathForUser, resolveSafePath };
