const fs = require('fs');
let file = 'backend/src/utils/csv.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "let str = value instanceof Date ? value.toISOString() : String(value);",
  "let str = value instanceof Date ? value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : String(value);"
);

fs.writeFileSync(file, content);
