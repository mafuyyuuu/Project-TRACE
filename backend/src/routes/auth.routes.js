const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { idProofUpload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/register', idProofUpload.single('id_proof'), authController.register);

// Admin account governance
router.get('/pending-students', authenticate, authController.getPendingStudents);
router.post('/verify-student/:id', authenticate, authController.verifyStudent);
router.get('/users', authenticate, authController.getUsers);
router.get('/student/:studentId', authenticate, authController.getStudent);

// Profile & in-app notifications
router.put('/profile', authenticate, authController.updateProfile);
router.get('/notifications', authenticate, authController.getNotifications);
router.put('/notifications/read', authenticate, authController.markNotificationsRead);

module.exports = router;
