const fs = require('fs');
const file = 'frontend/src/features/secretary/SecretaryDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import ReportsPanel')) {
  content = content.replace(
    "import DashboardLoading from '@/components/DashboardLoading';",
    "import DashboardLoading from '@/components/DashboardLoading';\nimport ReportsPanel from '@/features/admin/components/ReportsPanel';"
  );
  
  content = content.replace(
    "if (currentTab === 'completed-logs') {",
    "if (currentTab === 'reports') {\n    return <ReportsPanel />;\n  }\n\n  if (currentTab === 'completed-logs') {"
  );
  
  fs.writeFileSync(file, content);
}
