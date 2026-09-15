const express = require('express');
const reportsController = require('../controllers/reports.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/documents', reportsController.documentReport);
router.get('/analytics', reportsController.analytics);

// CSV downloads. `category` selects the student bucket: active | alumni | others | all
router.get('/export/students.csv', reportsController.exportStudents);
router.get('/export/documents.csv', reportsController.exportDocuments);

module.exports = router;
