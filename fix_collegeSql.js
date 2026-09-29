const fs = require('fs');
const file = 'backend/src/services/documents.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "'student_id IN (SELECT student_id FROM users WHERE course = ?)'",
  "'d.student_id IN (SELECT student_id FROM users WHERE course = ?)'"
);

fs.writeFileSync(file, content);
