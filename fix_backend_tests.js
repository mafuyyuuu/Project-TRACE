const fs = require('fs');

// Fix session.model.js
let session = fs.readFileSync('backend/src/models/session.model.js', 'utf8');
session = session.replace(
  "require('../../database/connection')",
  "require('../config/db')"
);
fs.writeFileSync('backend/src/models/session.model.js', session);

// Fix documents.service.test.cjs
let docTest = fs.readFileSync('backend/src/services/__tests__/documents.service.test.cjs', 'utf8');
docTest = docTest.replace(
  "toContain('current_status = ?')",
  "toContain('d.current_status = ?')"
);
fs.writeFileSync('backend/src/services/__tests__/documents.service.test.cjs', docTest);
