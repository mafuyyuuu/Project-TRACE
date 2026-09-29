const fs = require('fs');

// 1. StudentDashboard.jsx
const db = 'frontend/src/features/student/StudentDashboard.jsx';
let dbContent = fs.readFileSync(db, 'utf8');

dbContent = dbContent.replace(
  '<div className="text-sm font-bold text-gray-900">{doc.document_type}</div>',
  '<div className="text-sm font-bold text-gray-900">{doc.document_type} {doc.is_same_day ? <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] uppercase font-black rounded">Same Day Release</span> : null}</div>'
);

fs.writeFileSync(db, dbContent);

// 2. LiveTrackingModal.jsx
const tm = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let tmContent = fs.readFileSync(tm, 'utf8');

tmContent = tmContent.replace(
  '<h3 className="font-bold text-gray-900">{selectedDoc.document_type}</h3>',
  '<h3 className="font-bold text-gray-900 flex items-center gap-2">{selectedDoc.document_type} {selectedDoc.is_same_day ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-black rounded-full shadow-sm">Eligible for Same-Day Release</span> : null}</h3>'
);

fs.writeFileSync(tm, tmContent);
