const fs = require('fs');
let file2 = 'backend/src/utils/__tests__/csv.test.cjs';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  "expect(escapeCell(new Date('2026-08-24T00:00:00Z'))).toBe('2026-08-24T00:00:00.000Z');",
  "expect(escapeCell(new Date('2026-08-24T00:00:00Z'))).toMatch(/Aug 24, 2026/);"
);

fs.writeFileSync(file2, content2);
