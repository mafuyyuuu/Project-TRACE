const fs = require('fs');
const file = 'backend/src/app.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('ai.routes')) {
  content = content.replace(
    "const reportRoutes = require('./routes/reports.routes');",
    "const reportRoutes = require('./routes/reports.routes');\nconst aiRoutes = require('./routes/ai.routes');"
  );
  
  content = content.replace(
    "app.use('/api/reports', reportRoutes);",
    "app.use('/api/reports', reportRoutes);\napp.use('/api/ai', aiRoutes);"
  );
  
  fs.writeFileSync(file, content);
}
