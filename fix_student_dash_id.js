const fs = require('fs');
let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'onClick={handleNewRequestClick}\n                className="flex items-center gap-2 bg-[#15803d]',
  'id="tutorial-new-request"\n                onClick={handleNewRequestClick}\n                className="flex items-center gap-2 bg-[#15803d]'
);

fs.writeFileSync(file, content);
