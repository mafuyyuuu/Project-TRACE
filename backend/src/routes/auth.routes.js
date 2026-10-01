const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticatorController = require('../controllers/authenticator.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const { idProofUpload, profilePictureUpload } = require('../middlewares/upload.middleware');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.post('/login', loginLimiter, authController.login);
router.post('/verify-2fa', loginLimiter, authController.verify2FA);
router.get('/me', authenticate, authController.getMe);
router.get('/authenticator', authenticate, authenticatorController.status);
router.post('/authenticator/setup', authenticate, loginLimiter, authenticatorController.begin);
router.post('/authenticator/confirm', authenticate, loginLimiter, authenticatorController.confirm);
router.post('/authenticator/disable', authenticate, loginLimiter, authenticatorController.disable);
router.post('/authenticator/recovery-codes', authenticate, loginLimiter, authenticatorController.regenerate);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/security-logs', authenticate, authController.getSecurityLogs);
router.get('/global-security-logs', authenticate, requireRole('admin'), authController.getGlobalSecurityLogs);
router.post('/register', registerLimiter, idProofUpload.single('id_proof'), authController.register);

// Password recovery. Deliberately unauthenticated — the whole point is that the
// caller cannot log in. Both are throttled; see rateLimit.middleware.js.
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

// Admin account governance
router.get('/pending-students', authenticate, authController.getPendingStudents);
router.post('/verify-student/:id', authenticate, authController.verifyStudent);
router.get('/users', authenticate, authController.getUsers);
router.get('/student/:studentId', authenticate, requireRole('admin', 'clerk'), authController.getStudent);

// Profile & in-app notifications
router.put('/profile', authenticate, authController.updateProfile);
router.post('/verify-email-change', authenticate, authController.verifyEmailChange);
router.put('/profile/picture', authenticate, profilePictureUpload.single('picture'), authController.updateProfilePicture);
router.get('/notifications', authenticate, authController.getNotifications);
router.put('/notifications/read', authenticate, authController.markNotificationsRead);

module.exports = router;
