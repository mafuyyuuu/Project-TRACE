const fs = require('fs');
let file = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetIndex = content.indexOf('</ModalShell>');
if (targetIndex !== -1) {
  // Find the closing brace of the component
  const braceIndex = content.indexOf('}', targetIndex);
  if (braceIndex !== -1) {
    content = content.slice(0, braceIndex + 1) + '\n';
  }
}
fs.writeFileSync(file, content);
