const fs = require('fs');
let file = 'backend/src/services/__tests__/passwordReset.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "vi.spyOn(userModel, 'updateProfile').mockResolvedValue(true);",
  "vi.spyOn(userModel, 'updateProfile').mockResolvedValue(true);\n  vi.spyOn(userModel, 'findById').mockResolvedValue([{ id: 12, email: 'student@example.com' }]);"
);

fs.writeFileSync(file, content);
