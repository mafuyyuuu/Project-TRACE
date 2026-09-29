const fs = require('fs');
let migFile = 'backend/database/migration.js';
let migContent = fs.readFileSync(migFile, 'utf8');

migContent = migContent.replace(
  "    console.log('✅ Database migration completed successfully.');",
  "    console.log('Renaming Document Type: Certificate of Transfer Credential -> Transcript Credential Set');\n    await pool.query(\"UPDATE document_types SET name = 'Transcript Credential Set' WHERE name = 'Certificate of Transfer Credential'\");\n    await pool.query(\"UPDATE documents SET document_type = 'Transcript Credential Set' WHERE document_type = 'Certificate of Transfer Credential'\");\n    console.log('✅ Database migration completed successfully.');"
);

fs.writeFileSync(migFile, migContent);
