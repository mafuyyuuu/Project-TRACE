const fs = require('fs');

// seed.sql
let seedFile = 'backend/database/seed.sql';
let seedContent = fs.readFileSync(seedFile, 'utf8');

seedContent = seedContent.replace(
  "('Certificate of Transfer Credential', 150.00, 'flat', 0, 0, 'both', 1, 'Clearance (Signed by all depts)', 'A valid clearance proving no outstanding obligations.')",
  "('Transcript Credential Set', 150.00, 'flat', 0, 0, 'both', 1, 'Clearance (Signed by all depts)', 'A valid clearance proving no outstanding obligations.')"
);
fs.writeFileSync(seedFile, seedContent);

// migration.js
let migFile = 'backend/database/migration.js';
let migContent = fs.readFileSync(migFile, 'utf8');

const newCode = `
    // =======================================================================
    // Batch 9 - Registrar Consultation
    // =======================================================================
    console.log('\\n--- Batch 9: Request Numbering & Form Logic ---');

    await addColumn('documents', 'document_sequence_number', 'VARCHAR(50) NULL AFTER tracking_number');
    
    console.log('Renaming Document Type: Certificate of Transfer Credential -> Transcript Credential Set');
    await pool.query("UPDATE document_types SET name = 'Transcript Credential Set' WHERE name = 'Certificate of Transfer Credential'");
    await pool.query("UPDATE documents SET document_type = 'Transcript Credential Set' WHERE document_type = 'Certificate of Transfer Credential'");

    console.log('✅ Database migration completed successfully.');
`;

migContent = migContent.replace(/    \/\/ =======================================================================\n    \/\/ Batch 9 - Registrar Consultation\n    \/\/ =======================================================================\n    console\.log\('\\n--- Batch 9: Request Numbering ---'\);\n\n    await addColumn\('documents', 'document_sequence_number', 'VARCHAR\(50\) NULL AFTER tracking_number'\);\n\n    console\.log\('✅ Database migration completed successfully\.'\);\n/, newCode);
fs.writeFileSync(migFile, migContent);
