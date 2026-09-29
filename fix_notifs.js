const fs = require('fs');
const file = 'frontend/src/layouts/Layout.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "setShowMobileNav(false)",
  "setShowMobileNav(false);\n    setShowNotifs(false);"
);

fs.writeFileSync(file, content);
