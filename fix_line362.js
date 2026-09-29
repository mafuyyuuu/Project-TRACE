const fs = require('fs');
const file = 'backend/src/services/documents.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "(assigned_clerk_id = ?",
  "(d.assigned_clerk_id = ?"
);
content = content.replace(
  "AND (assigned_clerk_id IS NULL",
  "AND (d.assigned_clerk_id IS NULL"
);
content = content.replace(
  "OR assigned_clerk_id NOT IN",
  "OR d.assigned_clerk_id NOT IN"
);

fs.writeFileSync(file, content);
