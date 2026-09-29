const fs = require('fs');
let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "doc.current_status === STATUS.COMPLETED ? 'bg-emerald-50 text-[#15803d]' : isAwaitingStudent(doc.current_status) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'",
  "doc.current_status === STATUS.COMPLETED || doc.current_status === 'APPROVED' ? 'bg-emerald-50 text-[#15803d]' : doc.current_status === 'REJECTED' ? 'bg-gray-100 text-gray-500 line-through' : isAwaitingStudent(doc.current_status) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'"
);

fs.writeFileSync(file, content);
