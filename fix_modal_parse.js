const fs = require('fs');
let file = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// The replacement was:
// '        </div>\n        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">'
// Let's just find the end and add a div!
content = content.replace(
  "    </ModalShell>",
  "      </div>\n    </ModalShell>"
);

fs.writeFileSync(file, content);
