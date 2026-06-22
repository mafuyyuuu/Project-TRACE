const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trace-jwt-secret-change-in-production';

/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header (Bearer scheme),
 * verifies it, and attaches the decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      full_name: decoded.full_name,
      desk_assignment: decoded.desk_assignment,
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
