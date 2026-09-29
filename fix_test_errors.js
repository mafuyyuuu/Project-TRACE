const fs = require('fs');

// 1. auth.service.js
let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');
if (!authContent.includes("const { pool } = require('../config/db');")) {
  authContent = authContent.replace(
    "const userModel = require('../models/user.model');",
    "const userModel = require('../models/user.model');\nconst { pool } = require('../config/db');"
  );
}
fs.writeFileSync(authFile, authContent);

// 2. auth.service.test.cjs
let testFile = 'backend/src/services/__tests__/auth.service.test.cjs';
let testContent = fs.readFileSync(testFile, 'utf8');

const updatedSpies = `
  vi.spyOn(userModel, 'logSecurityEvent').mockResolvedValue([]);
`;

if (!testContent.includes("vi.spyOn(userModel, 'logSecurityEvent')")) {
  testContent = testContent.replace(
    "vi.spyOn(userModel, 'addPasswordHistory').mockResolvedValue([]);",
    "vi.spyOn(userModel, 'addPasswordHistory').mockResolvedValue([]);\n" + updatedSpies
  );
}

// Since "lets staff in regardless of verification status" expects { token: ... }, but now it returns { requires_2fa: true, temp_token: ... }, we need to update the expectation.
testContent = testContent.replace(
  "await expect(service.login({ employee_id: 'FIN', password: 'Trace2024!' })).resolves.toHaveProperty('token');",
  "await expect(service.login({ employee_id: 'FIN', password: 'Trace2024!' })).resolves.toHaveProperty('requires_2fa', true);"
);

fs.writeFileSync(testFile, testContent);

// One more place in login test, where it says "issues a JWT carrying the role and desk". Since student DOES NOT require 2FA, it should still return a token!
// Wait! Does my code force 2FA for students? No, requires2FA is user.two_factor_enabled || isStaff.
