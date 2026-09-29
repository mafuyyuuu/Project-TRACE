const fs = require('fs');
let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "                  </div>\n                </div>\n                </div>",
  "                  </div>\n                </div>"
);

fs.writeFileSync(file, content);
