const express = require('express');
const gradController = require('../controllers/gradApplication.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Literal paths first, so they aren't swallowed by the `/:id` wildcard.
router.get('/form-fields', authenticate, gradController.getFormFields);
router.get('/mine', authenticate, gradController.listMine);

router.get('/', authenticate, gradController.list);          // staff review queue
router.post('/', authenticate, gradController.submit);
router.get('/:id', authenticate, gradController.getOne);
router.post('/:id/review', authenticate, gradController.review);

module.exports = router;
