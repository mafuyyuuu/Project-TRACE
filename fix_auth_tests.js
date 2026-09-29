const fs = require('fs');
let file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

// Replace simple passwords with complex ones
content = content.replace(/password: 'trace2024'/g, "password: 'Trace2024!'");
content = content.replace(/password: 'pw'/g, "password: 'Trace2024!'");
content = content.replace(/password: 'wrong'/g, "password: 'WrongPassword1!'");
content = content.replace(/password: 'newpw'/g, "password: 'NewPassword2024!'");

// In register setup:
content = content.replace(
  "  const body = { employee_id: 'STU-NEW', password: 'Trace2024!', role: 'student', full_name: 'Test' };",
  "  const body = { employee_id: 'STU-NEW', password: 'Trace2024!', role: 'student', full_name: 'Test' };\n  beforeEach(() => { userModel.addPasswordHistory.mockResolvedValue(true); });"
);

// In updateProfile setup:
content = content.replace(
  "describe('updateProfile', () => {",
  "describe('updateProfile', () => {\n  beforeEach(() => {\n    userModel.getProfileById.mockResolvedValue([{ email: 'old@plp.edu.ph', student_id: 'STU-1' }]);\n    userModel.findActiveByStudentId.mockResolvedValue([{ password_hash: 'hashed' }]);\n    userModel.getPasswordHistory.mockResolvedValue([]);\n    userModel.addPasswordHistory.mockResolvedValue(true);\n  });"
);

// We need to mock getLoginSecurity in login
content = content.replace(
  "describe('login', () => {",
  "describe('login', () => {\n  beforeEach(() => {\n    userModel.getLoginSecurity.mockResolvedValue([{ id: 1, failed_login_attempts: 0, locked_until: null }]);\n  });"
);

fs.writeFileSync(file, content);
