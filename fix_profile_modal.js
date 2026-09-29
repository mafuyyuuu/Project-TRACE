const fs = require('fs');
let file = 'frontend/src/components/ProfileSettingsModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'alt="Preview"',
  'alt="New profile picture preview"'
);

content = content.replace(
  'className="absolute -bottom-1 -right-1 w-8 h-8',
  'aria-label="Change profile picture"\n              className="absolute -bottom-1 -right-1 w-8 h-8'
);

fs.writeFileSync(file, content);
