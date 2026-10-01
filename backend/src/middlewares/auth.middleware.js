const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');


const { pool } = require('../config/db');
const sessions = require('../models/session.model');

/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header (Bearer scheme),
 * verifies it, and attaches the decoded user payload to req.user.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.pending_2fa || !Number.isInteger(decoded.id) || !Number.isInteger(decoded.token_version)
      || !['student', 'admin', 'clerk'].includes(decoded.role) || !Number.isInteger(decoded.exp)) {
      return res.status(401).json({ error: 'Complete login verification before accessing TRACE.' });
    }
    
    // SEC-09: Token Version Check for Global Logout
    if (decoded.token_version !== undefined) {
      const [rows] = await pool.query(`SELECT token_version, is_active, role, user_type, must_change_password, email_verified_at,
        EXISTS(SELECT 1 FROM grad_applications g WHERE g.student_id = users.student_id) AS has_grad_application
        FROM users WHERE id = ?`, [decoded.id]);
      if (!rows || rows.length === 0 || !rows[0].is_active || rows[0].token_version !== decoded.token_version) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      const account = rows[0];
      if (account.role && account.role !== decoded.role) return res.status(401).json({ error: 'Account permissions changed. Sign in again.' });
      const route = `${req.baseUrl || ''}${req.path || ''}`;
      const accountRecovery = ['/api/auth/me', '/api/auth/logout', '/api/auth/logout-all', '/api/auth/email-verification/resend'];
      if (account.must_change_password && ![...accountRecovery, '/api/auth/profile'].includes(route)) {
        return res.status(403).json({ error: 'Change your temporary password before continuing.', code: 'PASSWORD_CHANGE_REQUIRED' });
      }
      if (decoded.role === 'student' && account.user_type === 'alumni' && !Number(account.has_grad_application)
        && !accountRecovery.includes(route) && !['/api/grad-applications', '/api/grad-applications/form-fields', '/api/grad-applications/mine'].includes(route)) {
        return res.status(403).json({ error: 'Submit your graduate application before accessing other features.', code: 'GRAD_APPLICATION_REQUIRED' });
      }
      if (decoded.role === 'student' && account.email_verified_at === null && req.method !== 'GET'
        && !/^\/api\/support\/[1-9]\d*\/messages$/.test(route)
        && !accountRecovery.includes(route) && !['/api/auth/profile', '/api/auth/profile/picture', '/api/grad-applications'].includes(route)) {
        return res.status(403).json({ error: 'Verify your email using the link sent to your inbox before continuing.', code: 'EMAIL_VERIFICATION_REQUIRED' });
      }
    }

    const sessionHash = sessions.hashToken(token);
    if (await sessions.revoked(sessionHash)) return res.status(401).json({ error: 'Session ended. Please log in again.' });
    req.user = {
      session_hash: sessionHash, expires_at: decoded.exp,
      id: decoded.id,
      role: decoded.role,
      full_name: decoded.full_name,
      desk_assignment: decoded.desk_assignment,
      user_type: decoded.user_type,
      token_version: decoded.token_version,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}


/**
 * Role-based authorization middleware factory.
 * Usage: requireRole('admin', 'clerk')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
