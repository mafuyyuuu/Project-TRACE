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
 * Staff review other people's documents as part of their job, so clerks and
 * admins may read any upload. A student may only read files attached to their
 * own request, plus their own registration ID proof.
 */
async function assertCanRead(user, filename) {
  if (user.role === 'clerk' || user.role === 'admin') return;

  const owner = await userModel.findStudentIdById(user.id);
  const studentId = owner[0] && owner[0].student_id;
  if (!studentId) throw forbidden('You do not have access to this file.');

  const docs = await documentModel.findByAttachedFilename(filename);
  if (docs.length > 0 && docs[0].student_id === studentId) return;

  const idProofOwner = await userModel.findByIdProofFilename(filename);
  if (idProofOwner.length > 0 && idProofOwner[0].id === user.id) return;

  throw forbidden('You do not have access to this file.');
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
