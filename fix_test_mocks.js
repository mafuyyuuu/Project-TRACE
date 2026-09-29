const fs = require('fs');
let file = 'backend/src/services/__tests__/auth.service.test.cjs';
let content = fs.readFileSync(file, 'utf8');

const updatedMock = `vi.mock('../../models/user.model.js', () => ({
  default: {
    findActiveByStudentId: vi.fn(),
    getProfileById: vi.fn(),
    findExistingByStudentId: vi.fn(),
    createUser: vi.fn(),
    updateProfile: vi.fn(),
    findProfilePictureById: vi.fn(),
    deleteById: vi.fn(),
    findStudentBasicInfo: vi.fn(),
    getLoginSecurity: vi.fn(),
    incrementFailedLogin: vi.fn(),
    lockAccount: vi.fn(),
    resetLoginSecurity: vi.fn(),
    getPasswordHistory: vi.fn(),
    addPasswordHistory: vi.fn(),
  },
}));`;

content = content.replace(
  /vi\.mock\('\.\.\/\.\.\/models\/user\.model\.js', \(\) => \(\{\n  default: \{[\s\S]*?\},\n\}\)\);/,
  updatedMock
);

fs.writeFileSync(file, content);
