const express = require('express');
const reportsController = require('../controllers/reports.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/filter-options', reportsController.filterOptions);
router.get('/documents', reportsController.documentReport);
router.get('/export/:kind.pdf', requireRole('admin'), reportsController.exportPdf);
router.get('/analytics', reportsController.analytics);

// CSV downloads. `category` selects the student bucket: active | alumni | others | all
router.get('/export/students.csv', reportsController.exportStudents);
router.get('/export/documents.csv', reportsController.exportDocuments);

module.exports = router;
