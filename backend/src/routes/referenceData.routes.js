const express = require('express');
const referenceController = require('../controllers/referenceData.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Signup needs colleges and programs before an account exists. These active
// catalog reads are public; other reference reads require a session.
router.get('/colleges', referenceController.getColleges);
router.get('/programs', referenceController.getPrograms);
router.get('/document-types', authenticate, referenceController.getDocumentTypes);
router.get('/payment-methods', authenticate, referenceController.getPaymentMethods);

module.exports = router;
