const fs = require('fs');

const files = [
  'frontend/src/features/window1/Window1Dashboard.jsx',
  'frontend/src/features/secretary/SecretaryDashboard.jsx',
  'frontend/src/features/finance/FinanceDashboard.jsx',
  'frontend/src/features/admin/AdminDashboard.jsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove corrupted line completely
  content = content.replace(/import StudentProfileModal from '@\/components\/StudentProfileModal'; from '@\/components\/DashboardLoading';\n?/g, '');
  
  // Deduplicate DashboardLoading
  content = content.replace(/(import DashboardLoading from '@\/components\/DashboardLoading';\n)+/g, "import DashboardLoading from '@/components/DashboardLoading';\n");

  // Add StudentProfileModal exactly once
  if (!content.includes('import StudentProfileModal from')) {
    content = content.replace("import DashboardLoading", "import StudentProfileModal from '@/components/StudentProfileModal';\nimport DashboardLoading");
  }
  
  fs.writeFileSync(file, content);
}
