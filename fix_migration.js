const fs = require('fs');

let file = 'backend/database/migration.js';
let content = fs.readFileSync(file, 'utf8');

const newCode = `
    // =======================================================================
    // Batch 9 - Registrar Consultation
    // =======================================================================
    console.log('\\n--- Batch 9: Request Numbering ---');

    await addColumn('documents', 'document_sequence_number', 'VARCHAR(50) NULL AFTER tracking_number');

    console.log('✅ Database migration completed successfully.');
`;

content = content.replace("    console.log('✅ Database migration completed successfully.');", newCode.trim());
fs.writeFileSync(file, content);
