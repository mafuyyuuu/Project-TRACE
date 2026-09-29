const fs = require('fs');
let file = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the horizontal bars
content = content.replace(
  /{[\s\S]*?\/\* Background Progress Bar \*\/[\s\S]*?\/\* Nodes \*\//m,
  "{/* Nodes */"
);

// Add connectors inside each node and change container to flex-wrap
content = content.replace(
  '<div className="relative w-full flex items-center justify-between mb-20 mt-2">',
  '<div className="relative w-full flex flex-wrap items-start justify-center gap-y-16 mb-6 mt-2">'
);

// Update node rendering
content = content.replace(
  '<div key={node.step} className="relative z-10 flex flex-col items-center" style={{ width: `${nodeWidthPercent}%` }}>',
  '<div key={node.step} className="relative z-10 flex flex-col items-center w-1/3 sm:w-1/4 md:w-[11.1%]">'
);

// Add horizontal connecting lines (CSS pseudo-elements) to the icon container
content = content.replace(
  'className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm',
  'className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm\n                  ${index !== TRACKER_NODES.length - 1 ? "after:content-[''] after:absolute after:top-1/2 after:-right-[100%] after:w-full after:h-1 after:-translate-y-1/2 md:after:w-[200%] md:after:-right-[200%] " + (isCompleted ? "after:bg-[#15803d]" : "after:bg-gray-100") : ""}'
);

// Remove break-words
content = content.replace(
  'w-full break-words px-0.5',
  'w-[120%] px-0.5'
);

fs.writeFileSync(file, content);
