const express = require('express');
const maintenanceController = require('../controllers/maintenance.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Every route is admin-only; the service layer enforces it.
router.use(authenticate);

// Colleges
router.get('/colleges', maintenanceController.listColleges);
router.post('/colleges', maintenanceController.createCollege);
router.put('/colleges/:id', maintenanceController.updateCollege);
// "Delete" is a deactivation — historical records reference these by name.
router.patch('/colleges/:id/active', maintenanceController.setCollegeActive);

// Document types
router.get('/document-types', maintenanceController.listDocumentTypes);
router.post('/document-types', maintenanceController.createDocumentType);
router.put('/document-types/:id', maintenanceController.updateDocumentType);
router.patch('/document-types/:id/active', maintenanceController.setDocumentTypeActive);

// Staff
router.get('/staff', maintenanceController.listStaff);
router.post('/staff', maintenanceController.createStaff);
router.put('/staff/:id', maintenanceController.updateStaff);
router.patch('/staff/:id/active', maintenanceController.setStaffActive);

module.exports = router;
