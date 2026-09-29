const fs = require('fs');
const file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "    sessionModel.findSession.mockResolvedValue({ id: 1 });\n    sessionModel.createSession.mockResolvedValue(1);",
  "  vi.spyOn(sessionModel, 'findSession').mockResolvedValue({ id: 1 });\n  vi.spyOn(sessionModel, 'createSession').mockResolvedValue(1);"
);

fs.writeFileSync(file, content);
