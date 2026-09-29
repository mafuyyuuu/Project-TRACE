const fs = require('fs');

let testFile = 'backend/src/services/__tests__/auth.service.test.cjs';
let testContent = fs.readFileSync(testFile, 'utf8');

const poolMock = `
vi.mock('../../config/db', () => ({
  pool: {
    query: vi.fn().mockResolvedValue([[]]),
  }
}));
`;

testContent = testContent.replace(
  "const fs = require('fs');",
  poolMock + "\nconst fs = require('fs');"
);

fs.writeFileSync(testFile, testContent);
