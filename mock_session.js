const fs = require('fs');
const file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('sessionModel.findSession.mockResolvedValue')) {
  // Add mock for sessionModel
  content = content.replace(
    "const userModel = require('../../models/user.model');",
    "const userModel = require('../../models/user.model');\nconst sessionModel = require('../../models/session.model');"
  );
  
  content = content.replace(
    "vi.mock('../../models/user.model');",
    "vi.mock('../../models/user.model');\nvi.mock('../../models/session.model');"
  );
  
  content = content.replace(
    "beforeEach(() => {",
    "beforeEach(() => {\n    sessionModel.findSession.mockResolvedValue({ id: 1 });\n    sessionModel.createSession.mockResolvedValue(1);"
  );
  
  fs.writeFileSync(file, content);
}
