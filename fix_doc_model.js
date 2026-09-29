const fs = require('fs');
const file = 'backend/src/models/document.model.js';
let content = fs.readFileSync(file, 'utf8');

// Update listDocuments
content = content.replace(
  "let query = 'SELECT * FROM documents';",
  "let query = 'SELECT d.*, u.course, u.college_id FROM documents d LEFT JOIN users u ON d.student_id = u.student_id';"
);
content = content.replace(
  "if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');",
  "if (conditions.length > 0) query += ' WHERE ' + conditions.map(c => 'd.' + c).join(' AND ');" // Not always safe if conditions contain table aliases, but let's check
);

fs.writeFileSync(file, content);
