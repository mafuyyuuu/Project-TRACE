const fs = require('fs');
let file = 'frontend/src/features/admin/components/ForecastModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "allowDecimals={false} />",
  "allowDecimals={false} domain={[0, 'auto']} />"
);

fs.writeFileSync(file, content);
