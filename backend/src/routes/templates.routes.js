const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templates.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

router.get('/', authenticate, templatesController.list);
router.get('/:key', authenticate, templatesController.getByKey);
router.put('/:key', authenticate, requireRole('admin'), templatesController.update);

module.exports = router;
