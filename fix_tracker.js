const fs = require('fs');
let file = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'break-words',
  ''
);

content = content.replace(
  '<div className="relative w-full flex items-center justify-between mb-20 mt-2">',
  '<div className="relative w-full min-w-[700px] flex items-center justify-between mb-20 mt-2">'
);

content = content.replace(
  '{/* Background Progress Bar */}',
  '<div className="w-full overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 sm:overflow-visible">\n          {/* Background Progress Bar */}'
);

content = content.replace(
  '{TRACKER_NODES.map((node, index) => {',
  '{TRACKER_NODES.map((node, index) => {'
);

// close the new div
content = content.replace(
  '        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">',
  '        </div>\n        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">'
);

fs.writeFileSync(file, content);
