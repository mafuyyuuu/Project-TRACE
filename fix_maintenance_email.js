const fs = require('fs');
let file = 'backend/src/services/maintenance.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const bcrypt = require('bcrypt');",
  "const bcrypt = require('bcrypt');\nconst notifications = require('./notification.service');"
);

content = content.replace(
  "  await userModel.setUserActive(id, Boolean(isActive));",
  "  await userModel.setUserActive(id, Boolean(isActive));\n\n  if (!isActive && rows[0].email) {\n    if (notifications.notifyByEmail) {\n      await notifications.notifyByEmail({\n        email: rows[0].email,\n        title: 'Account Deactivated',\n        message: 'Your Project TRACE staff account has been deactivated. Please contact an administrator if you believe this is a mistake.'\n      });\n    }\n  }"
);

fs.writeFileSync(file, content);
