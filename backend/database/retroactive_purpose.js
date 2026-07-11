const { pool } = require('../config/db');

async function fixPurpose() {
  try {
    const [rows] = await pool.query('SELECT id, purpose FROM documents WHERE purpose IS NOT NULL');
    let updatedCount = 0;
    
    for (const row of rows) {
      if (!row.purpose) continue;
      
      try {
        const parsed = JSON.parse(row.purpose);
        let modified = false;
        
        // Remove empty purpose
        if (parsed.purpose === "") {
          delete parsed.purpose;
          modified = true;
        }
        
        // Rename reason to purpose
        if (parsed.reason) {
          parsed.purpose = parsed.reason;
          delete parsed.reason;
          modified = true;
        }

        if (modified) {
          const newPurpose = JSON.stringify(parsed);
          await pool.query('UPDATE documents SET purpose = ? WHERE id = ?', [newPurpose, row.id]);
          updatedCount++;
          console.log(`Updated document ${row.id} to: ${newPurpose}`);
        }
      } catch (err) {
        // Not a JSON string, ignore
      }
    }
    
    console.log(`Successfully updated ${updatedCount} documents retroactively.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

fixPurpose();
