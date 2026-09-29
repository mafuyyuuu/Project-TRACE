const fs = require('fs');
let file = 'backend/src/middlewares/auth.middleware.js';
let content = fs.readFileSync(file, 'utf8');

const updatedAuth = `
const { pool } = require('../config/db');

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
    
    // SEC-09: Token Version Check for Global Logout
    if (decoded.token_version !== undefined) {
      const [rows] = await pool.query('SELECT token_version FROM users WHERE id = ?', [decoded.id]);
      if (!rows || rows.length === 0 || rows[0].token_version !== decoded.token_version) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
    }

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
`;

content = content.replace(
  /\/\*\*[\s\S]*?function authenticate\(req, res, next\) \{[\s\S]*?\}\n/,
  updatedAuth + '\n'
);

// Add pool import at top if missing
if (!content.includes("const { pool } = require('../config/db');")) {
  content = content.replace(
    "const { JWT_SECRET } = require('../config/env');",
    "const { JWT_SECRET } = require('../config/env');\nconst { pool } = require('../config/db');"
  );
}

fs.writeFileSync(file, content);
