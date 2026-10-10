const express = require('express');
const documentsController = require('../controllers/documents.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { documentUpload, pertinentUpload } = require('../middlewares/upload.middleware');
const { verifyWebhookSecret } = require('../middlewares/webhookAuth.middleware');

const router = express.Router();

// `.any()` so a multi-document request can carry one attachment per item
// (`document_0`, `document_1`, …) while the legacy single `document` field
// keeps working. The service maps files to items by field name.
router.post('/upload', authenticate, documentUpload.any(), documentsController.upload);
router.get('/', authenticate, documentsController.list);

// Dashboard analytics. These must stay above `/:trackingNumber` so the
// literal paths aren't swallowed by the wildcard.
router.get('/stats', authenticate, documentsController.stats);
router.get('/stats/forecast', authenticate, documentsController.forecast);
router.get('/stats/insights', authenticate, documentsController.insights);
router.get('/activity-logs', authenticate, documentsController.activityLogs);
router.get('/messages/threads', authenticate, documentsController.messageThreads);
const financeController = require('../controllers/finance.controller');
router.get('/finance/transactions', authenticate, financeController.transactions);
router.get('/finance/transactions/export', authenticate, financeController.exportTransactions);
router.get('/:id/detail', authenticate, documentsController.detail);
router.get('/:id/assignment', authenticate, documentsController.assignmentContext);
router.post('/:id/assignment', authenticate, documentsController.reassign);
router.put('/:id/routing-college', authenticate, documentsController.reconcileCollege);

// Public tracking lookup (no auth — students track by tracking number).
router.get('/:trackingNumber', documentsController.track);

// Internal endpoint called by the n8n router. No user session, so it is
// guarded by the shared webhook secret instead of a JWT.
router.post('/assign', verifyWebhookSecret, documentsController.assign);

// Desk actions, in pipeline order. All POSTs, so none of them is shadowed by
// the `GET /:trackingNumber` wildcard above.
router.post('/:id/intake', authenticate, documentUpload.single('document'), documentsController.intake);
router.post('/:id/accept', authenticate, documentsController.accept);
router.post('/:id/price', authenticate, documentsController.price);
router.post('/:id/submit-payment', authenticate, documentUpload.single('receipt'), documentsController.submitPayment);
// Reads a receipt image and returns what it saw. Records nothing, so it takes
// no document id — the clerk confirms the figures before submitting them.
router.post('/scan-receipt', authenticate, documentUpload.single('receipt'), documentsController.scanReceipt);
router.post('/:id/log-walkin-payment', authenticate, documentUpload.single('officialReceipt'), documentsController.logWalkInPayment);
router.post('/:id/verify-payment', authenticate, documentUpload.single('officialReceipt'), documentsController.verifyPayment);
router.post('/:id/deferred-or', authenticate, documentUpload.single('officialReceipt'), documentsController.uploadDeferredOR);
// College Secretary checks the Official Receipt before the printed document
// can be handed to Window 1 — see docs/CODING_PREFERENCES.md on why this stays
// a procedural check and never sets payment_status itself.
router.post('/:id/verify-or', authenticate, documentsController.verifyOfficialReceipt);
router.post('/:id/handoff', authenticate, documentsController.handoff);
router.post('/:id/release', authenticate, documentsController.release);
router.get('/:id/messages', authenticate, documentsController.getMessages);
router.post('/:id/messages', authenticate, require('../middlewares/legacyMessaging.middleware').readOnly);
router.delete('/:id', authenticate, documentsController.cancel);

const attachments = require('../controllers/requestAttachments.controller');
router.get('/:id/attachments', authenticate, attachments.list);
router.get('/:id/attachments/:requirementId/history', authenticate, attachments.history);
router.post('/:id/attachments', authenticate, attachments.request);
router.post('/:id/attachments/:requirementId/upload', authenticate, pertinentUpload.single('attachment'), attachments.upload);
router.post('/:id/attachments/:requirementId/review', authenticate, attachments.review);

module.exports = router;
