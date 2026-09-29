const fs = require('fs');

let navFile = 'frontend/src/utils/navigation.js';
let navContent = fs.readFileSync(navFile, 'utf8');

navContent = navContent.replace(
  "{ tab: 'admin-logs', to: '/dashboard?tab=admin-logs', label: 'Activity Logs', icon: 'checklist' },",
  "{ tab: 'admin-logs', to: '/dashboard?tab=admin-logs', label: 'Activity Logs', icon: 'checklist' },\n      { tab: 'admin-security', to: '/dashboard?tab=admin-security', label: 'Security Logs', icon: 'users' },"
);
fs.writeFileSync(navFile, navContent);
