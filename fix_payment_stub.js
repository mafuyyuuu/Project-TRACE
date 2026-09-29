const fs = require('fs');
const file = 'frontend/src/features/secretary/components/PaymentStubModal.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('selectedDoc.course')) {
  content = content.replace(
    '<div className="flex justify-between"><span>Student ID</span><span className="font-bold text-gray-900">{selectedDoc.student_id || \'—\'}</span></div>',
    '<div className="flex justify-between"><span>Student ID</span><span className="font-bold text-gray-900">{selectedDoc.student_id || \'—\'}</span></div>\n        <div className="flex justify-between"><span>Program/Course</span><span className="font-bold text-gray-900">{selectedDoc.course || \'—\'}</span></div>'
  );
  fs.writeFileSync(file, content);
}
