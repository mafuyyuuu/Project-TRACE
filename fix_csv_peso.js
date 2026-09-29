const fs = require('fs');
let file = 'backend/src/services/reports.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const rows = await reportModel.listDocumentsForReport(filters, { limit: 10000, offset: 0 });",
  "const rows = await reportModel.listDocumentsForReport(filters, { limit: 10000, offset: 0 });\n  rows.forEach(r => { if (r.amount !== undefined) r.amount = '₱' + Number(r.amount).toFixed(2); });"
);

fs.writeFileSync(file, content);
