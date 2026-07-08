const { pool } = require('../config/db');

async function migrate() {
  console.log('🔄 Starting database migration...');
  try {
    // 1. Alter documents table: change current_status to VARCHAR(50) for flexibility
    console.log('Altering current_status column...');
    await pool.query(`
      ALTER TABLE documents 
      MODIFY COLUMN current_status VARCHAR(50) DEFAULT 'pending_payment'
    `);

    // 2. Add receipt_image_path column if not exists
    console.log('Adding receipt_image_path column...');
    try {
      await pool.query(`
        ALTER TABLE documents 
        ADD COLUMN receipt_image_path VARCHAR(500) NULL AFTER file_path
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log('-> receipt_image_path already exists.');
      } else {
        throw err;
      }
    }

    // 3. Add gcash_reference_no column if not exists
    console.log('Adding gcash_reference_no column...');
    try {
      await pool.query(`
        ALTER TABLE documents 
        ADD COLUMN gcash_reference_no VARCHAR(255) NULL AFTER payment_reference_id
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log('-> gcash_reference_no already exists.');
      } else {
        throw err;
      }
    }

    // 4. Update seed users to match specified desk assignments
    console.log('Seeding desk-specific users...');
    const users = [
      {
        student_id: 'FINANCE001',
        email: 'finance@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', // trace2024
        full_name: 'Finance Officer',
        role: 'clerk',
        desk_assignment: 'Finance'
      },
      {
        student_id: 'WINDOW1001',
        email: 'window1@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', // trace2024
        full_name: 'Window 1 Clerk',
        role: 'clerk',
        desk_assignment: 'Window 1'
      },
      {
        student_id: 'SEC001',
        email: 'secretary@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', // trace2024
        full_name: 'College Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary'
      }
    ];

    for (const u of users) {
      const [existing] = await pool.query('SELECT id FROM users WHERE student_id = ?', [u.student_id]);
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, is_active)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [u.student_id, u.email, u.password_hash, u.full_name, u.role, u.desk_assignment]
        );
        console.log(`-> Seeded user ${u.full_name} (${u.student_id})`);
      } else {
        // Update user details just in case
        await pool.query(
          `UPDATE users SET desk_assignment = ?, role = ? WHERE student_id = ?`,
          [u.desk_assignment, u.role, u.student_id]
        );
        console.log(`-> Updated user ${u.full_name} (${u.student_id})`);
      }
    }

    console.log('✅ Database migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
