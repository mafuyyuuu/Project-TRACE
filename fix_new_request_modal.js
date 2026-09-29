const fs = require('fs');
const file = 'frontend/src/features/student/components/NewRequestModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove copies input
content = content.replace(
  /<label className="text-\[10px\] font-bold text-gray-700 uppercase tracking-widest">\s*Copies\s*<\/label>\s*<input\s*type="number" min="1" required\s*value=\{selection\.copies\}\s*onChange=\{\(e\) => updateSelection\(type\.name, \{ copies: e\.target\.value \}\)\}\s*className="w-full bg-white border border-gray-200 rounded-xl p-2\.5 text-xs outline-none focus:ring-2 focus:ring-\[#15803d\]\/20"\s*\/>/g,
  ""
);
// Also remove the containing div if needed, but let's just use a broader regex or replace exact block.
