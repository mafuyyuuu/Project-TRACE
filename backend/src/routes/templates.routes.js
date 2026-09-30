const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templates.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, templatesController.list);
router.get('/:key', authenticate, templatesController.getByKey);
router.put('/:key', authenticate, authorize(['admin']), templatesController.update);

module.exports = router;
