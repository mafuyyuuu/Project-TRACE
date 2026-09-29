const fs = require('fs');
const file = 'backend/src/models/document.model.js';
let content = fs.readFileSync(file, 'utf8');

// Update listDocuments
content = content.replace(
  "let query = 'SELECT d.*, u.course, u.college_id FROM documents d LEFT JOIN users u ON d.student_id = u.student_id';",
  "let query = 'SELECT d.*, u.course, u.college_id, dt.is_same_day FROM documents d LEFT JOIN users u ON d.student_id = u.student_id LEFT JOIN document_types dt ON d.document_type = dt.name';"
);

fs.writeFileSync(file, content);
