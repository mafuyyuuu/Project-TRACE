const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/supportMessage.controller');
router.use(authenticate);
router.get('/', controller.list);
router.get('/:studentId/messages', controller.read);
router.post('/:studentId/messages', controller.send);
module.exports = router;
