const fs = require('fs');
let file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "userModel.findActiveByStudentId.mockResolvedValue([{ password_hash: 'hashed' }]);",
  "userModel.findActiveByStudentId.mockResolvedValue([{ password_hash: passwordHash }]);"
);

fs.writeFileSync(file, content);
