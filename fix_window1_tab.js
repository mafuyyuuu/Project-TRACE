const fs = require('fs');
const file = 'frontend/src/features/window1/Window1Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import ReportsPanel')) {
  content = content.replace(
    "import DashboardLoading from '@/components/DashboardLoading';",
    "import DashboardLoading from '@/components/DashboardLoading';\nimport ReportsPanel from '@/features/admin/components/ReportsPanel';"
  );
  
  // Find return statement block
  content = content.replace(
    "if (currentTab === 'tracking-desk') {",
    "if (currentTab === 'reports') {\n    return <ReportsPanel />;\n  }\n\n  if (currentTab === 'tracking-desk') {"
  );
  
  fs.writeFileSync(file, content);
}
