const fs = require('fs');

let dashFile = 'frontend/src/features/admin/AdminDashboard.jsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');

dashContent = dashContent.replace(
  "import GradApplicationReviewPanel from './components/GradApplicationReviewPanel';",
  "import GradApplicationReviewPanel from './components/GradApplicationReviewPanel';\nimport AdminSecurityPanel from './components/AdminSecurityPanel';"
);

dashContent = dashContent.replace(
  "  if (currentTab === 'admin-grad-applications') return <GradApplicationReviewPanel user={user} currentTab={currentTab} />;",
  "  if (currentTab === 'admin-grad-applications') return <GradApplicationReviewPanel user={user} currentTab={currentTab} />;\n  if (currentTab === 'admin-security') return <AdminSecurityPanel />;"
);

fs.writeFileSync(dashFile, dashContent);
