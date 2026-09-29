const fs = require('fs');
const file = 'frontend/src/components/__tests__/ProfileSettingsModal.test.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "/click save settings to apply/i",
  "/click save profile to apply/i"
);

fs.writeFileSync(file, content);
