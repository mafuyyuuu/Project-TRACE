const fs = require('fs');
const file = 'frontend/src/utils/navigation.js';
let content = fs.readFileSync(file, 'utf8');

// Add Reports to Secretary
content = content.replace(
  "{ tab: 'grad-applications', to: '/dashboard?tab=grad-applications', label: 'Graduate Applications', icon: 'cap' },",
  "{ tab: 'grad-applications', to: '/dashboard?tab=grad-applications', label: 'Graduate Applications', icon: 'cap' },\n      { tab: 'reports', to: '/dashboard?tab=reports', label: 'Reports & Export', icon: 'report' },"
);

// Add Reports to Window 1
content = content.replace(
  "{ tab: 'tracking-desk', to: '/dashboard?tab=tracking-desk', label: 'Tracking Desk', icon: 'users' },",
  "{ tab: 'tracking-desk', to: '/dashboard?tab=tracking-desk', label: 'Tracking Desk', icon: 'users' },\n      { tab: 'reports', to: '/dashboard?tab=reports', label: 'Reports & Export', icon: 'report' },"
);

fs.writeFileSync(file, content);
