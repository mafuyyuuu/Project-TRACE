const fs = require('fs');
const file = 'frontend/src/layouts/__tests__/SidebarNav.test.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "['secretary', SECRETARY, ['dashboard', 'completed-logs', 'grad-applications']],",
  "['secretary', SECRETARY, ['dashboard', 'completed-logs', 'grad-applications', 'reports']],"
);

content = content.replace(
  "['window 1', WINDOW1, ['dashboard', 'tracking-desk']],",
  "['window 1', WINDOW1, ['dashboard', 'tracking-desk', 'reports']],"
);

fs.writeFileSync(file, content);
