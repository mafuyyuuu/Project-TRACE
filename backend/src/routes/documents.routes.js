const express = require('express');
const documentsController = require('../controllers/documents.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { documentUpload } = require('../middlewares/upload.middleware');
const { verifyWebhookSecret } = require('../middlewares/webhookAuth.middleware');

const router = express.Router();

router.post('/upload', authenticate, documentUpload.single('document'), documentsController.upload);
router.get('/', authenticate, documentsController.list);

// Dashboard analytics. These must stay above `/:trackingNumber` so the
// literal paths aren't swallowed by the wildcard.
router.get('/stats', authenticate, documentsController.stats);
router.get('/stats/forecast', authenticate, documentsController.forecast);
router.get('/stats/insights', authenticate, documentsController.insights);
router.get('/activity-logs', authenticate, documentsController.activityLogs);

// Public tracking lookup (no auth — students track by tracking number).
router.get('/:trackingNumber', documentsController.track);

// Internal endpoint called by the n8n router. No user session, so it is
// guarded by the shared webhook secret instead of a JWT.
router.post('/assign', verifyWebhookSecret, documentsController.assign);

// Desk actions
router.post('/:id/action', authenticate, documentsController.action);
router.post('/:id/submit-payment', authenticate, documentUpload.single('receipt'), documentsController.submitPayment);
router.post('/:id/verify-payment', authenticate, documentUpload.single('officialReceipt'), documentsController.verifyPayment);
router.post('/:id/evaluate', authenticate, documentsController.evaluate);
router.post('/:id/release', authenticate, documentsController.release);
router.delete('/:id', authenticate, documentsController.cancel);

module.exports = router;
