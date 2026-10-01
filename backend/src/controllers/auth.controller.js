const authService = require('../services/auth.service');
const deviceLogin = require('../services/deviceLogin.service');
const trustedBrowser = require('../services/trustedBrowser.service');

/**
 * Thin HTTP layer for /api/auth. Each handler unpacks the request, calls the
 * service, and maps the outcome to a status code — no business logic here.
 */

/** Translate a thrown error into a response, defaulting to 500. */
function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body, req.ip, req.headers['user-agent'], req.headers.cookie);
    if (req.body.shared_computer !== false) clearTrustCookie(res);
    await setDeviceCookie(req, res, result);
    res.json(result);
  } catch (err) {
    fail(res, err, 'Login error', 'Internal server error.');
  }
}

async function getMe(req, res) {
  try {
    res.json(await authService.getCurrentUser(req.user.id));
  } catch (err) {
    fail(res, err, 'Get current user error', 'Internal server error.');
  }
}

async function register(req, res) {
  try {
    res.status(201).json(await authService.register(req.body, req.file));
  } catch (err) {
    fail(res, err, 'Registration error', 'Internal server error.');
  }
}

async function getPendingStudents(req, res) {
  try {
    res.json(await authService.listPendingStudents(req.user));
  } catch (err) {
    fail(res, err, 'Fetch pending students error', 'Failed to retrieve pending student accounts.');
  }
}

async function verifyStudent(req, res) {
  try {
    res.json(await authService.verifyStudentAccount(req.user, req.params.id, req.body.action));
  } catch (err) {
    fail(res, err, 'Verify student account error', 'Failed to update student account verification.');
  }
}

async function getUsers(req, res) {
  try {
    res.json(await authService.listAllUsers(req.user));
  } catch (err) {
    fail(res, err, 'Fetch all users error', 'Failed to fetch users.');
  }
}

async function getStudent(req, res) {
  try {
    res.json(await authService.lookupStudent(req.params.studentId, req.user));
  } catch (err) {
    fail(res, err, 'Student lookup error', 'Failed to look up student.');
  }
}

async function updateProfile(req, res) {
  try {
    const result = await authService.updateProfile(req.user.id, req.body);
    if (req.body.password) clearTrustCookie(res);
    res.json(result);
  } catch (err) {
    fail(res, err, 'Update profile error', 'Failed to update profile.');
  }
}

async function updateProfilePicture(req, res) {
  try {
    res.json(await authService.updateProfilePicture(req.user.id, req.file));
  } catch (err) {
    fail(res, err, 'Update profile picture error', 'Failed to update profile picture.');
  }
}

async function getNotifications(req, res) {
  try {
    res.json(await authService.listNotifications(req.user.id));
  } catch (err) {
    fail(res, err, 'Fetch notifications error', 'Failed to fetch notifications.');
  }
}

async function markNotificationsRead(req, res) {
  try {
    res.json(await authService.markNotificationsRead(req.user.id));
  } catch (err) {
    fail(res, err, 'Mark read error', 'Failed to mark notifications as read.');
  }
}

async function forgotPassword(req, res) {
  try {
    res.json(await authService.requestPasswordReset(req.body));
  } catch (err) {
    fail(res, err, 'Forgot password error', 'Failed to start password reset.');
  }
}

async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body);
    clearTrustCookie(res);
    res.json(result);
  } catch (err) {
    fail(res, err, 'Reset password error', 'Failed to reset password.');
  }
}

async function setDeviceCookie(req, res, result) {
  if (!result.token || !result.user) return;
  const value = await deviceLogin.recordLogin(result.user, req.headers.cookie, req.ip, req.headers['user-agent']);
  if (value) res.cookie(deviceLogin.COOKIE_NAME, value, deviceLogin.COOKIE_OPTIONS);
}

async function verify2FA(req, res) {
  try {
    const { browserTrust, ...result } = await authService.verify2FA(req.body.temp_token, req.body.otp,
      req.ip, req.headers['user-agent'], req.body.trust_browser === true, req.body.recovery_code);
    if (browserTrust) {
      res.cookie(trustedBrowser.COOKIE_NAME, browserTrust.value, {
        ...trustedBrowser.COOKIE_OPTIONS, expires: new Date(browserTrust.expiresAt),
      });
      result.browser_trusted_until = new Date(browserTrust.expiresAt).toISOString();
    }
    await setDeviceCookie(req, res, result);
    res.json(result);
  } catch (err) { fail(res, err, 'OTP login error', 'Could not verify login.'); }
}
async function verifyEmailChange(req, res) {
  try { res.json(await authService.verifyEmailChange(req.user.id, req.body.otp)); }
  catch (err) { fail(res, err, 'Email verification error', 'Could not verify email.'); }
}
async function getSecurityLogs(req, res) {
  try { res.json(await authService.getSecurityLogs(req.user.id)); }
  catch (err) { fail(res, err, 'Security logs error', 'Could not load security logs.'); }
}
async function getGlobalSecurityLogs(req, res) {
  try { res.json(await authService.getGlobalSecurityLogs()); }
  catch (err) { fail(res, err, 'Global security logs error', 'Could not load security logs.'); }
}
async function logoutAll(req, res) {
  try {
    const result = await authService.logoutAll(req.user.id, req.body?.preserve_current === true, req.user.token_version);
    clearTrustCookie(res);
    res.json(result);
  }
  catch (err) { fail(res, err, 'Global logout error', 'Could not close sessions.'); }
}

async function logout(req, res) {
  try { const result = await authService.logout(req.user); res.json(result); }
  catch (err) { fail(res, err, 'Logout error', 'Could not end this session.'); }
}

function clearTrustCookie(res) {
  res.clearCookie(trustedBrowser.COOKIE_NAME, trustedBrowser.COOKIE_OPTIONS);
}

module.exports = {
  logout, verify2FA, verifyEmailChange, getSecurityLogs, getGlobalSecurityLogs, logoutAll,
  login,
  getMe,
  register,
  forgotPassword,
  resetPassword,
  getPendingStudents,
  verifyStudent,
  getUsers,
  getStudent,
  updateProfile,
  updateProfilePicture,
  getNotifications,
  markNotificationsRead,
};
