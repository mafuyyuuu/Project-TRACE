const express = require('express');
const filesController = require('../controllers/files.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Replaces the old unauthenticated `express.static('/uploads')` mount.
router.get('/:filename', authenticate, filesController.get);

module.exports = router;
