const express = require('express');
const controller = require('../controllers/ai.controller');
const { signupOcrUpload } = require('../middlewares/upload.middleware');
const { signupOcrLimiter } = require('../middlewares/rateLimit.middleware');
const router = express.Router();
// Signup has no session yet. Bound and throttle the read-only OCR operation.
router.post('/extract-id', signupOcrLimiter, signupOcrUpload.single('id_proof'), controller.extractIdentity);
module.exports = router;
