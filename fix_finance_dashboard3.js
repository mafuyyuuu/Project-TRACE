const fs = require('fs');
let file = 'frontend/src/features/finance/FinanceDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'await api.uploadDeferredOR(doc.id, file);',
  'await uploadDeferredOR(doc.id, file);'
);
content = content.replace(
  "import { getStatusLabel } from '@/utils/documentStatus';",
  "import { getStatusLabel } from '@/utils/documentStatus';\nimport { uploadDeferredOR } from '@/services/documentsService';"
);
fs.writeFileSync(file, content);
