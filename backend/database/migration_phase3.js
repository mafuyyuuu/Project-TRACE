const fs = require('fs');
let file = 'backend/database/migration.js';
let content = fs.readFileSync(file, 'utf8');

const newCode = `
    // =======================================================================
    // Batch 9 - Phase 3 (Messaging & Templates)
    // =======================================================================
    console.log('\\n--- Batch 9 Phase 3: Messaging & Templates ---');

    // CN-11: In-App Messaging
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS document_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    \`);
    await addIndex('document_messages', 'idx_document_messages_doc', 'document_id');

    // CN-12: System Templates (Payment Slips, Receipts, Notices)
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS system_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_key VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        content LONGTEXT NULL,
        font_family VARCHAR(100) DEFAULT 'sans-serif',
        font_size VARCHAR(20) DEFAULT '12px',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    \`);

    // Seed default templates
    await pool.query(\`
      INSERT IGNORE INTO system_templates (template_key, name) VALUES 
      ('payment_slip', 'Order of Payment (Slip)'),
      ('email_notice', 'Standard Email Notice')
    \`);

    console.log('✅ Database migration completed successfully.');
`;

content = content.replace("    console.log('✅ Database migration completed successfully.');", newCode.trim());
fs.writeFileSync(file, content);
