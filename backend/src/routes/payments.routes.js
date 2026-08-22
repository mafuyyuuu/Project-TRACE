const express = require('express');
const paymentsController = require('../controllers/payments.controller');

const router = express.Router();

router.post('/webhook', paymentsController.webhook);
router.post('/simulate-payment', paymentsController.simulatePayment);

module.exports = router;
