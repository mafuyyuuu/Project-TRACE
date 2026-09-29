const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "{isSaving ? 'Saving...' : 'Save Changes'}",
  "{isSaving ? 'Processing...' : (showEmailOTP ? 'Verify Email' : 'Save Changes')}"
);

fs.writeFileSync(file, content);
