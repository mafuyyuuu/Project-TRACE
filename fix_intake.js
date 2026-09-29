const fs = require('fs');
const file = 'frontend/src/features/window1/components/IntakeReviewModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /<div className="space-y-4">[\s\S]*?<\/div>[\s]*?<\/div>\n      <\/ModalShell>/;
let match = content.match(/<div className="space-y-4">[\s\S]*?(?=<\/ModalShell>)/);
if (match) {
  let inner = match[0].trim();
  content = content.replace(match[0], `{needsPaper && (\n      ${inner}\n      )}\n    `);
  fs.writeFileSync(file, content);
}
