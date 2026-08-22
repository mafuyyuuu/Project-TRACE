const express = require('express');
const paymentsController = require('../controllers/payments.controller');
const { verifyWebhookSecret } = require('../middlewares/webhookAuth.middleware');

const router = express.Router();

// Machine-to-machine only. Previously open, which meant anyone could post a
// forged "paid" payload and mark a document as settled.
router.post('/webhook', verifyWebhookSecret, paymentsController.webhook);
router.post('/simulate-payment', verifyWebhookSecret, paymentsController.simulatePayment);

module.exports = router;
