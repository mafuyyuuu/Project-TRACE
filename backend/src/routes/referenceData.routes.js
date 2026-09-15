const express = require('express');
const referenceController = require('../controllers/referenceData.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Colleges are needed on the signup page, before an account exists — so this
// one read is deliberately public. Everything else requires a session.
router.get('/colleges', referenceController.getColleges);
router.get('/document-types', authenticate, referenceController.getDocumentTypes);
router.get('/payment-methods', authenticate, referenceController.getPaymentMethods);

module.exports = router;
