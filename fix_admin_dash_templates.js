const fs = require('fs');
let dashFile = 'frontend/src/features/admin/AdminDashboard.jsx';
let content = fs.readFileSync(dashFile, 'utf8');

if (!content.includes('AdminTemplatesPanel')) {
  content = "import AdminTemplatesPanel from './components/AdminTemplatesPanel';\n" + content;
}

content = content.replace(
  "{currentTab === 'admin-maintenance' && <AdminMaintenancePanel user={user} />}",
  "{currentTab === 'admin-maintenance' && <AdminMaintenancePanel user={user} />}\n        {currentTab === 'admin-templates' && <AdminTemplatesPanel />}"
);

fs.writeFileSync(dashFile, content);

let navFile = 'frontend/src/utils/navigation.js';
let navContent = fs.readFileSync(navFile, 'utf8');
const navCode = `
    { id: 'admin-grad-applications', tab: 'admin-grad-applications', icon: AcademicCapIcon, label: 'Applications', desc: 'Manage graduate applications', desk: 'Admin Office' },
    { id: 'admin-templates', tab: 'admin-templates', icon: DocumentTextIcon, label: 'Templates', desc: 'Edit printed templates', desk: 'Admin Office' },
    { id: 'admin-maintenance', tab: 'admin-maintenance', icon: WrenchScrewdriverIcon, label: 'Maintenance', desc: 'System configuration', desk: 'Admin Office' }
`;
navContent = navContent.replace(
  /\{\s*id: 'admin-grad-applications'[\s\S]*?admin-maintenance'[\s\S]*?\}\s*,/m,
  navCode.trim() + ','
);
fs.writeFileSync(navFile, navContent);
