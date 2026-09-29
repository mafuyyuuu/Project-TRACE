const fs = require('fs');
const file = 'frontend/src/features/window1/components/IntakeReviewModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"',
  'className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"'
);

fs.writeFileSync(file, content);
