const fs = require('fs');

// documents.service.js
let svc = fs.readFileSync('backend/src/services/documents.service.js', 'utf8');

const deferredFunc = `
/** FIN-03: Deferred OR Upload */
async function uploadDeferredOR(user, documentId, file) {
  requireDesk(user, 'Finance', 'Only Finance can upload deferred ORs.');
  if (!file) throw badRequest('No receipt file provided.');
  
  const officialReceiptPath = \`/uploads/\${file.filename}\`;
  
  // Find document
  const doc = await documentModel.findById(documentId);
  if (!doc) throw notFound('Document not found.');
  
  // Only update if it doesn't already have one, or if we allow overwriting.
  await pool.query(
    'UPDATE documents SET official_receipt_path = ?, or_uploaded_at = CURRENT_TIMESTAMP WHERE request_group_id = ?',
    [officialReceiptPath, doc.request_group_id || doc.tracking_number]
  );
  
  // Notify student (FIN-02)
  const notifications = require('./notification.service');
  await notifications.triggerNotification(
    doc.student_id,
    'Official Receipt Uploaded',
    \`Your Official Receipt for request #\${doc.tracking_number || doc.id} has been uploaded and is available to view in your dashboard.\`,
    'student'
  );
  
  return { success: true, official_receipt_path: officialReceiptPath };
}
`;

if (!svc.includes('uploadDeferredOR')) {
  svc = svc.replace(
    'module.exports = {',
    deferredFunc + '\nmodule.exports = {\n  uploadDeferredOR,'
  );
  fs.writeFileSync('backend/src/services/documents.service.js', svc);
}

// documents.controller.js
let ctrl = fs.readFileSync('backend/src/controllers/documents.controller.js', 'utf8');
if (!ctrl.includes('uploadDeferredOR')) {
  const ctrlFunc = `
async function uploadDeferredOR(req, res) {
  res.json(await documentsService.uploadDeferredOR(req.user, req.params.id, req.file));
}
`;
  ctrl = ctrl.replace(
    'module.exports = {',
    ctrlFunc + '\nmodule.exports = {\n  uploadDeferredOR,'
  );
  fs.writeFileSync('backend/src/controllers/documents.controller.js', ctrl);
}

// documents.routes.js
let rts = fs.readFileSync('backend/src/routes/documents.routes.js', 'utf8');
if (!rts.includes('uploadDeferredOR')) {
  rts = rts.replace(
    "router.post('/:id/verify-payment', authenticate, documentUpload.single('officialReceipt'), documentsController.verifyPayment);",
    "router.post('/:id/verify-payment', authenticate, documentUpload.single('officialReceipt'), documentsController.verifyPayment);\nrouter.post('/:id/deferred-or', authenticate, documentUpload.single('officialReceipt'), documentsController.uploadDeferredOR);"
  );
  fs.writeFileSync('backend/src/routes/documents.routes.js', rts);
}

