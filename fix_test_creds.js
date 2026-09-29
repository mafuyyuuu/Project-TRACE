const fs = require('fs');
let file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "passwordHash = await bcrypt.hash('trace2024', 10);",
  "passwordHash = await bcrypt.hash('Trace2024!', 10);"
);

content = content.replace(
  "await service.updateProfile(3, { password: 'NewPassword2024!' });",
  "await service.updateProfile(3, { password: 'NewPassword2024!', current_password: 'Trace2024!' });"
);

// We need to fix the expected 401 instead of 403 in "blocks a student whose account is pending"
// The new logic in auth.service.js throws 'unauthorized' (401) for incorrect password / locked,
// but the old tests expected a 403 (forbidden). Wait, my `handleFailedLogin` block
// completely replaced the block where it threw 403.
// Wait! Let's look at `auth.service.js` login.

fs.writeFileSync(file, content);
