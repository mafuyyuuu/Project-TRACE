const fs = require('fs');
const file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

// Replace lines 41 to 58 (the whole SEC-01 block)
const sec01Regex = /\/\/ SEC-01: New Device Login Tracking[\s\S]*?await pool\.query\([\s\S]*?\);\n\s*\}/;
content = content.replace(sec01Regex, '');

fs.writeFileSync(file, content);
