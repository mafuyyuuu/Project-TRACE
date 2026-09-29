const fs = require('fs');

// 1. auth.service.js
let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');

const updatedEmailChange = `
  if (emailChanged) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60000); // 15 mins
    
    await pool.query(
      'UPDATE users SET pending_email = ?, email_otp = ?, email_otp_expires = ? WHERE id = ?',
      [email, otp, expires, userId]
    );

    const nodemailer = require('nodemailer'); // Assumes we use notification.service
    const notifications = require('./notification.service');
    
    // Send OTP to new email
    if (notifications.notifyByEmail) {
      await notifications.notifyByEmail({
        email: email,
        title: 'Verify Your New Email',
        message: \`Your verification code is: \${otp}. It expires in 15 minutes.\`
      });
      // Notify old email
      await notifications.notifyByEmail({
        email: currentUser.email,
        title: 'Email Change Requested',
        message: 'A request to change your email address was initiated. If this was not you, please contact support.'
      });
    }
    
    await userModel.logSecurityEvent(userId, 'EMAIL_CHANGE_REQUESTED');
    // We don't update fields.email yet!
  }
`;

authContent = authContent.replace(
  "if (emailChanged) { fields.email = email; await userModel.logSecurityEvent(userId, 'EMAIL_CHANGE'); }",
  updatedEmailChange
);

const verifyEmailChangeFn = `
async function verifyEmailChange(userId, otp) {
  const [rows] = await pool.query('SELECT pending_email, email_otp, email_otp_expires FROM users WHERE id = ?', [userId]);
  if (!rows || rows.length === 0) throw notFound('User not found.');
  
  const user = rows[0];
  if (!user.pending_email || !user.email_otp) {
    throw badRequest('No email change requested.');
  }
  
  if (user.email_otp !== otp) {
    throw unauthorized('Invalid verification code.');
  }
  
  if (new Date(user.email_otp_expires) < new Date()) {
    throw badRequest('Verification code expired.');
  }
  
  await pool.query(
    'UPDATE users SET email = ?, pending_email = NULL, email_otp = NULL, email_otp_expires = NULL WHERE id = ?',
    [user.pending_email, userId]
  );
  
  await userModel.logSecurityEvent(userId, 'EMAIL_CHANGED');
  return { message: 'Email address updated successfully.' };
}
`;

authContent = authContent.replace(
  "async function getGlobalSecurityLogs",
  verifyEmailChangeFn + "\nasync function getGlobalSecurityLogs"
);

authContent = authContent.replace(
  "getGlobalSecurityLogs,",
  "verifyEmailChange,\n  getGlobalSecurityLogs,"
);

fs.writeFileSync(authFile, authContent);

// 2. auth.controller.js
let ctrlFile = 'backend/src/controllers/auth.controller.js';
let ctrlContent = fs.readFileSync(ctrlFile, 'utf8');
const verifyCtrlFn = `
exports.verifyEmailChange = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) throw require('../utils/AppError').badRequest('OTP is required.');
    const result = await authService.verifyEmailChange(req.user.id, otp);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
`;
ctrlContent = ctrlContent.replace("exports.getGlobalSecurityLogs", verifyCtrlFn + "\nexports.getGlobalSecurityLogs");
fs.writeFileSync(ctrlFile, ctrlContent);

// 3. auth.routes.js
let routesFile = 'backend/src/routes/auth.routes.js';
let routesContent = fs.readFileSync(routesFile, 'utf8');
routesContent = routesContent.replace(
  "router.put('/profile', authenticate, authController.updateProfile);",
  "router.put('/profile', authenticate, authController.updateProfile);\nrouter.post('/verify-email-change', authenticate, authController.verifyEmailChange);"
);
fs.writeFileSync(routesFile, routesContent);
