const fs = require('fs');
let file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

// Add the missing spyOn declarations
const extraSpies = `
  vi.spyOn(userModel, 'getLoginSecurity').mockResolvedValue([]);
  vi.spyOn(userModel, 'incrementFailedLogin').mockResolvedValue([]);
  vi.spyOn(userModel, 'lockAccount').mockResolvedValue([]);
  vi.spyOn(userModel, 'resetLoginSecurity').mockResolvedValue([]);
  vi.spyOn(userModel, 'getPasswordHistory').mockResolvedValue([]);
  vi.spyOn(userModel, 'addPasswordHistory').mockResolvedValue([]);
`;

content = content.replace(
  "  vi.spyOn(userModel, 'findProfilePictureById').mockResolvedValue([{ profile_picture: null }]);",
  "  vi.spyOn(userModel, 'findProfilePictureById').mockResolvedValue([{ profile_picture: null }]);\n" + extraSpies
);

// We had an issue with "stores a bcrypt hash, never the raw password" expect(await bcrypt.compare('pw', stored)).toBe(true);
content = content.replace(
  "expect(await bcrypt.compare('pw', stored)).toBe(true);",
  "expect(await bcrypt.compare('Trace2024!', stored)).toBe(true);"
);

fs.writeFileSync(file, content);
