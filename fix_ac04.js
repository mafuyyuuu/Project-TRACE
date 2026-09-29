const fs = require('fs');

// ProfileSettingsModal.jsx
const profileModalFile = 'frontend/src/components/ProfileSettingsModal.jsx';
let profileModal = fs.readFileSync(profileModalFile, 'utf8');
profileModal = profileModal.replace(/Profile Settings/g, 'Edit Profile');
profileModal = profileModal.replace(/Save Settings/g, 'Save Profile');
fs.writeFileSync(profileModalFile, profileModal);

// Layout.jsx
const layoutFile = 'frontend/src/layouts/Layout.jsx';
let layout = fs.readFileSync(layoutFile, 'utf8');
layout = layout.replace(/>Settings</g, '>Edit Profile<');
fs.writeFileSync(layoutFile, layout);

// SidebarNav.jsx
const sidebarFile = 'frontend/src/layouts/SidebarNav.jsx';
let sidebar = fs.readFileSync(sidebarFile, 'utf8');
sidebar = sidebar.replace(/label: 'Settings'/g, "label: 'Preferences'");
fs.writeFileSync(sidebarFile, sidebar);
