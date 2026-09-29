const fs = require('fs');
let file = 'frontend/src/features/secretary/useSecretaryDashboard.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "    if (activeModal === 'price' && selectedDoc && pricePageCount) {",
  "    if (core.activeModal === 'price' && selectedDoc && pricePageCount) {"
);

content = content.replace(
  "  }, [pricePageCount, selectedDoc, activeModal]);",
  "  }, [pricePageCount, selectedDoc, core.activeModal]);"
);

fs.writeFileSync(file, content);
