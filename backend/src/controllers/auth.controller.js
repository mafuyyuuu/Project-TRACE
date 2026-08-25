const authService = require('../services/auth.service');

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
    res.json(await authService.login(req.body));
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
    res.json(await authService.lookupStudent(req.params.studentId));
  } catch (err) {
    fail(res, err, 'Student lookup error', 'Failed to look up student.');
  }
}

async function updateProfile(req, res) {
  try {
    res.json(await authService.updateProfile(req.user.id, req.body));
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

module.exports = {
  login,
  getMe,
  register,
  getPendingStudents,
  verifyStudent,
  getUsers,
  getStudent,
  updateProfile,
  updateProfilePicture,
  getNotifications,
  markNotificationsRead,
};
