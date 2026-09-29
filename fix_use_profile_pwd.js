const fs = require('fs');
let file = 'frontend/src/hooks/useProfileSettings.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "password: '',",
  "password: '',\n    current_password: '',"
);

content = content.replace(
  "setProfileData((current) => ({ ...current, password: '' }));",
  "setProfileData((current) => ({ ...current, password: '', current_password: '' }));"
);

fs.writeFileSync(file, content);
