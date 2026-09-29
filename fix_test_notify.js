const fs = require('fs');
let file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "describe('updateProfile', () => {",
  "describe('updateProfile', () => {\n  beforeEach(() => { notificationModel.notifyByEmail = vi.fn(); });\n"
);
fs.writeFileSync(file, content);

let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');
authContent = authContent.replace(
  "await notifications.notifyByEmail(",
  "if (notifications.notifyByEmail) await notifications.notifyByEmail("
);
fs.writeFileSync(authFile, authContent);
