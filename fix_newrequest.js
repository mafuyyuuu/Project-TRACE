const fs = require('fs');
let file = 'frontend/src/features/student/components/NewRequestModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  const total = groupTotal(documentTypes, selections);",
  "  const availableTypes = documentTypes.filter(t => t.available_to === 'both' || t.available_to === user.user_type);\n  const total = groupTotal(documentTypes, selections);"
);

content = content.replace(
  "documentTypes.length === 0",
  "availableTypes.length === 0"
);

content = content.replace(
  "{documentTypes.map((type)",
  "{availableTypes.map((type)"
);

fs.writeFileSync(file, content);
