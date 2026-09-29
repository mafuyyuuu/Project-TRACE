const fs = require('fs');

let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\{doc\.document_type\}/g, "{doc.document_sequence_number || doc.document_type}");

fs.writeFileSync(file, content);
