const fs = require('fs');
const file = 'backend/src/services/documents.service.js';
let content = fs.readFileSync(file, 'utf8');

// The function listDocuments starts at around line 300.
// Let's replace the column names inside that function.
content = content.replace("conditions.push('student_id = ?')", "conditions.push('d.student_id = ?')");
content = content.replace("conditions.push('current_status = ?')", "conditions.push('d.current_status = ?')");
content = content.replace("conditions.push('current_status = ?');", "conditions.push('d.current_status = ?');");
content = content.replace("conditions.push('current_status IN (?, ?)')", "conditions.push('d.current_status IN (?, ?)')");
content = content.replace("conditions.push('current_status IN (?, ?, ?, ?, ?, ?)')", "conditions.push('d.current_status IN (?, ?, ?, ?, ?, ?)')");

fs.writeFileSync(file, content);
