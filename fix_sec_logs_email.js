const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "if (email !== undefined && email !== '') fields.email = email;",
  "if (emailChanged) { fields.email = email; await userModel.logSecurityEvent(userId, 'EMAIL_CHANGE'); }"
);

fs.writeFileSync(file, content);
