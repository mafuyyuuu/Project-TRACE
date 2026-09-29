const fs = require('fs');
let file = 'frontend/src/layouts/__tests__/SidebarNav.test.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "tab: 'admin-security',\n      'admin-reports'",
  "tab: 'admin-reports'"
);

fs.writeFileSync(file, content);
