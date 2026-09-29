const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "   else {\n    // Update last_active\n    await pool.query('UPDATE sessions SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [existingSessions[0].id]);\n  }",
  ""
);

fs.writeFileSync(file, content);
