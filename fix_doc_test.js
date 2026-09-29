const fs = require('fs');

let testFile = 'backend/src/services/__tests__/documents.service.test.cjs';
let content = fs.readFileSync(testFile, 'utf8');

content = content.replace(
  "  vi.spyOn(documentModel, 'sumGroupAmount').mockResolvedValue(0);",
  "  vi.spyOn(documentModel, 'sumGroupAmount').mockResolvedValue(0);\n  vi.spyOn(documentModel, 'countByTypeAndStudent').mockResolvedValue(0);"
);

fs.writeFileSync(testFile, content);
