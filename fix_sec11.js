const fs = require('fs');

let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');

const twoFactorLogin = `
  const isStaff = ['admin', 'clerk'].includes(user.role);
  const requires2FA = user.two_factor_enabled || isStaff;

  if (requires2FA) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60000); // 5 mins
    await pool.query('UPDATE users SET email_otp = ?, email_otp_expires = ? WHERE id = ?', [otp, expires, user.id]);
    
    const notifications = require('./notification.service');
    if (notifications.notifyByEmail && user.email) {
      await notifications.notifyByEmail({
        email: user.email,
        title: 'Project TRACE Login Verification',
        message: \`Your login verification code is: \${otp}. It expires in 5 minutes.\`
      });
    }

    const tempToken = jwt.sign({ id: user.id, pending_2fa: true }, env.JWT_SECRET, { expiresIn: '5m' });
    return { requires_2fa: true, temp_token: tempToken, email: user.email };
  }
`;

authContent = authContent.replace(
  "if (user.role === 'student' && user.verification_status !== 'verified') {",
  twoFactorLogin + "\n  if (user.role === 'student' && user.verification_status !== 'verified') {"
);

const verify2FAFn = `
async function verify2FA(tempToken, otp, ipAddress, userAgent) {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, env.JWT_SECRET);
  } catch (err) {
    throw unauthorized('Invalid or expired 2FA token. Please log in again.');
  }

  if (!decoded.pending_2fa) {
    throw badRequest('Invalid token type.');
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
  if (!rows || rows.length === 0) throw notFound('User not found.');
  const user = rows[0];

  if (user.email_otp !== otp) {
    throw unauthorized('Invalid verification code.');
  }
  
  if (new Date(user.email_otp_expires) < new Date()) {
    throw badRequest('Verification code expired.');
  }

  // Clear OTP
  await pool.query('UPDATE users SET email_otp = NULL, email_otp_expires = NULL WHERE id = ?', [user.id]);
  
  await userModel.logSecurityEvent(user.id, 'LOGIN', ipAddress, userAgent);

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      desk_assignment: user.desk_assignment,
      course: user.course,
      token_version: user.token_version || 1,
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { message: 'Login successful.', token, user };
}
`;

authContent = authContent.replace(
  "async function verifyEmailChange",
  verify2FAFn + "\nasync function verifyEmailChange"
);

authContent = authContent.replace(
  "verifyEmailChange,",
  "verify2FA,\n  verifyEmailChange,"
);

fs.writeFileSync(authFile, authContent);

// 2. auth.controller.js
let ctrlFile = 'backend/src/controllers/auth.controller.js';
let ctrlContent = fs.readFileSync(ctrlFile, 'utf8');
const verify2FACtrl = `
exports.verify2FA = async (req, res, next) => {
  try {
    const { temp_token, otp } = req.body;
    if (!temp_token || !otp) throw require('../utils/AppError').badRequest('Token and OTP are required.');
    const result = await authService.verify2FA(temp_token, otp, req.ip, req.get('User-Agent'));
    res.json(result);
  } catch (err) {
    next(err);
  }
};
`;
ctrlContent = ctrlContent.replace("exports.verifyEmailChange", verify2FACtrl + "\nexports.verifyEmailChange");
fs.writeFileSync(ctrlFile, ctrlContent);

// 3. auth.routes.js
let routesFile = 'backend/src/routes/auth.routes.js';
let routesContent = fs.readFileSync(routesFile, 'utf8');
routesContent = routesContent.replace(
  "router.post('/login', loginLimiter, authController.login);",
  "router.post('/login', loginLimiter, authController.login);\nrouter.post('/verify-2fa', loginLimiter, authController.verify2FA);"
);
fs.writeFileSync(routesFile, routesContent);
