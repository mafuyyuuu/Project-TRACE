const express = require('express');
const maintenanceController = require('../controllers/maintenance.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

// Every route is admin-only; the service layer enforces it.
router.use(authenticate);

// Registrar-approved program catalog
router.get('/programs', maintenanceController.listPrograms);
router.post('/programs', maintenanceController.createProgram);
router.patch('/programs/:id/active', maintenanceController.setProgramActive);

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

// Approved profile-only admin editing for every account type.
router.put('/users/:id', maintenanceController.updateAccount);

// Staff
router.get('/staff', maintenanceController.listStaff);
router.post('/staff', maintenanceController.createStaff);
router.put('/staff/:id', maintenanceController.updateStaff);
router.patch('/staff/:id/active', maintenanceController.setStaffActive);

// Payment methods
router.get('/payment-methods', maintenanceController.listPaymentMethods);
router.post('/payment-methods', maintenanceController.createPaymentMethod);
router.put('/payment-methods/:id', maintenanceController.updatePaymentMethod);
router.patch('/payment-methods/:id/active', maintenanceController.setPaymentMethodActive);

module.exports = router;
