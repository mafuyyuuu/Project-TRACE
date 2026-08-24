const { pool } = require('../src/config/db');

/**
 * Add a column only if it isn't already there, so the whole script stays safe
 * to re-run. MySQL has no `ADD COLUMN IF NOT EXISTS`, hence the error check.
 */
async function addColumn(table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`-> Added ${table}.${column}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`-> ${table}.${column} already exists.`);
    } else {
      throw err;
    }
  }
}

/** Same idea for indexes. */
async function addIndex(table, indexName, columns) {
  try {
    await pool.query(`CREATE INDEX ${indexName} ON ${table} (${columns})`);
    console.log(`-> Added index ${indexName} on ${table}`);
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log(`-> Index ${indexName} already exists.`);
    } else {
      throw err;
    }
  }
}

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
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('-> receipt_image_path already exists.');
      } else {
        throw err;
      }
    }

    // 2a. Add official_receipt_path column if not exists
    console.log('Adding official_receipt_path column...');
    try {
      await pool.query(`
        ALTER TABLE documents 
        ADD COLUMN official_receipt_path VARCHAR(500) NULL AFTER receipt_image_path
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('-> official_receipt_path already exists.');
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
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('-> gcash_reference_no already exists.');
      } else {
        throw err;
      }
    }

    // 3a. Add new columns to documents table
    console.log('Adding additional columns to documents...');
    try {
      await pool.query(`
        ALTER TABLE documents 
        ADD COLUMN amount DECIMAL(10,2) DEFAULT 150.00,
        ADD COLUMN copies INT DEFAULT 1,
        ADD COLUMN ocr_confidence_score DECIMAL(5,2) NULL,
        ADD COLUMN purpose VARCHAR(255) NULL
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('-> Additional columns already exist in documents.');
      } else {
        throw err;
      }
    }

    // 3b. Add course and phone_number columns to users table
    console.log('Adding additional columns to users...');
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN course VARCHAR(100) NULL,
        ADD COLUMN phone_number VARCHAR(20) NULL
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('-> Additional columns already exist in users.');
      } else {
        throw err;
      }
    }

    // 3c. Create notifications table
    console.log('Creating notifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 4. Update seed users to match specified desk assignments
    console.log('Seeding desk-specific users...');
    const users = [
      {
        student_id: 'FINANCE001',
        email: 'finance@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', // trace2024
        full_name: 'Finance Officer',
        role: 'clerk',
        desk_assignment: 'Finance',
        course: null
      },
      {
        student_id: 'WINDOW1001',
        email: 'window1@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', // trace2024
        full_name: 'Window 1 Clerk',
        role: 'clerk',
        desk_assignment: 'Window 1',
        course: null
      },
      // 7 College Secretaries (One per PLP College)
      {
        student_id: 'SEC-CCS001',
        email: 'sec.ccs@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'CCS Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of Computer Studies'
      },
      {
        student_id: 'SEC-CON001',
        email: 'sec.con@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'CON Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of Nursing'
      },
      {
        student_id: 'SEC-CIHM001',
        email: 'sec.cihm@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'CIHM Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of International Hospitality Management'
      },
      {
        student_id: 'SEC-COE001',
        email: 'sec.coe@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'COE Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of Engineering'
      },
      {
        student_id: 'SEC-CED001',
        email: 'sec.ced@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'CED Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of Education'
      },
      {
        student_id: 'SEC-CAS001',
        email: 'sec.cas@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'CAS Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of Arts and Sciences'
      },
      {
        student_id: 'SEC-CBA001',
        email: 'sec.cba@trace.edu',
        password_hash: '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm',
        full_name: 'CBA Secretary',
        role: 'clerk',
        desk_assignment: 'Secretary',
        course: 'College of Business and Accountancy'
      }
    ];

    for (const u of users) {
      const [existing] = await pool.query('SELECT id FROM users WHERE student_id = ?', [u.student_id]);
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', TRUE)`,
          [u.student_id, u.email, u.password_hash, u.full_name, u.role, u.desk_assignment, u.course]
        );
        console.log(`-> Seeded user ${u.full_name} (${u.student_id})`);
      } else {
        // Update user details just in case
        await pool.query(
          `UPDATE users SET desk_assignment = ?, role = ?, course = COALESCE(?, course) WHERE student_id = ?`,
          [u.desk_assignment, u.role, u.course, u.student_id]
        );
        console.log(`-> Updated user ${u.full_name} (${u.student_id})`);
      }
    }

    // =======================================================================
    // Category 1 — panel defense feedback
    //   * Irregular / Dropout student statuses
    //   * Multi-document requests (one payment, independent routing)
    //   * Admin-configurable Graduate Application form
    //   * Document types & colleges as reference data instead of hardcoded
    // =======================================================================
    console.log('\n--- Category 1: student status, multi-document, graduate module ---');

    // -- Student status -----------------------------------------------------
    // Two orthogonal axes on purpose: a student can be Irregular *and* Active,
    // whereas graduated/dropout/transferred are mutually exclusive outcomes.
    await addColumn('users', 'enrollment_status',
      "ENUM('active','graduated','dropout','transferred') NOT NULL DEFAULT 'active'");
    await addColumn('users', 'study_load',
      "ENUM('regular','irregular') NOT NULL DEFAULT 'regular'");

    // Backfill from the older `user_type` flag. Runs once — afterwards no rows
    // still carry the default while being marked alumni.
    const [backfilled] = await pool.query(
      `UPDATE users SET enrollment_status = 'graduated'
       WHERE user_type = 'alumni' AND enrollment_status = 'active'`
    );
    console.log(`-> Backfilled ${backfilled.affectedRows} alumni to enrollment_status='graduated'`);

    // -- Multi-document requests -------------------------------------------
    // Documents sharing a group id were requested and paid for together, but
    // each keeps its own status and desk routing.
    await addColumn('documents', 'request_group_id', 'VARCHAR(64) NULL AFTER tracking_number');
    await addIndex('documents', 'idx_documents_request_group', 'request_group_id');

    // Every historical document becomes a group of one, so existing queries
    // and the desk views behave exactly as before.
    const [grouped] = await pool.query(
      'UPDATE documents SET request_group_id = tracking_number WHERE request_group_id IS NULL'
    );
    console.log(`-> Backfilled ${grouped.affectedRows} existing documents as single-item groups`);

    // -- Reference data -----------------------------------------------------
    console.log('Creating reference tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS colleges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        short_code VARCHAR(20) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // `fee_rule` tells pricing.js which calculation to apply. Flat fees are
    // fully admin-editable; the per-semester-block rule (TOR) stays in code
    // because it is not a single number.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        base_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        fee_rule ENUM('flat','per_semester_block') NOT NULL DEFAULT 'flat',
        requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
        attachment_label VARCHAR(255) NULL,
        attachment_helper VARCHAR(255) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seeded to match exactly what was previously hardcoded in the signup page,
    // NewRequestModal, utils/documentStatus.js and utils/pricing.js — so
    // behaviour is identical the moment the UI switches to reading these.
    const COLLEGES = [
      ['College of Computer Studies', 'CCS'],
      ['College of Nursing', 'CON'],
      ['College of International Hospitality Management', 'CIHM'],
      ['College of Engineering', 'COE'],
      ['College of Education', 'CED'],
      ['College of Arts and Sciences', 'CAS'],
      ['College of Business and Accountancy', 'CBA'],
    ];
    for (const [i, [name, code]] of COLLEGES.entries()) {
      await pool.query(
        `INSERT INTO colleges (name, short_code, sort_order) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE short_code = VALUES(short_code), sort_order = VALUES(sort_order)`,
        [name, code, i]
      );
    }
    console.log(`-> Seeded ${COLLEGES.length} colleges`);

    const DOCUMENT_TYPES = [
      // name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper
      ['Transcript of Records', 100.0, 'per_semester_block', false, 'Optional Attachment (Clearances, Old ID, etc)', 'optional files'],
      ['Graduation Clearance', 50.0, 'flat', true, 'Required Attachment (Signed Routing Form)', 'signed clearance form'],
      ['Certificate of Good Moral', 50.0, 'flat', true, 'Required Attachment (Valid Student ID)', 'student ID photo'],
      ['Honorable Dismissal', 100.0, 'flat', true, 'Required Attachment (Validated Clearance)', 'clearance file'],
      ['Diploma', 50.0, 'flat', false, 'Optional Attachment (Clearances, Old ID, etc)', 'optional files'],
    ];
    for (const [i, [name, fee, rule, reqAtt, label, helper]] of DOCUMENT_TYPES.entries()) {
      await pool.query(
        `INSERT INTO document_types
           (name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           base_fee = VALUES(base_fee), fee_rule = VALUES(fee_rule),
           requires_attachment = VALUES(requires_attachment),
           attachment_label = VALUES(attachment_label),
           attachment_helper = VALUES(attachment_helper),
           sort_order = VALUES(sort_order)`,
        [name, fee, rule, reqAtt, label, helper, i]
      );
    }
    console.log(`-> Seeded ${DOCUMENT_TYPES.length} document types`);

    // -- Graduate application (admin-configurable form) ---------------------
    console.log('Creating graduate application tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grad_form_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        field_key VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(255) NOT NULL,
        field_type ENUM('text','textarea','number','date','select','email','tel') NOT NULL DEFAULT 'text',
        options JSON NULL,
        placeholder VARCHAR(255) NULL,
        help_text VARCHAR(255) NULL,
        is_required BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grad_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        status ENUM('submitted','under_review','approved','rejected') NOT NULL DEFAULT 'submitted',
        reviewed_by INT NULL,
        notes TEXT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_grad_applications_student (student_id)
      )
    `);

    // One row per answer, so the Registrar adding a field never needs a migration.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grad_application_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        field_key VARCHAR(100) NOT NULL,
        value TEXT NULL,
        UNIQUE KEY uq_application_field (application_id, field_key),
        FOREIGN KEY (application_id) REFERENCES grad_applications(id) ON DELETE CASCADE
      )
    `);

    // Placeholder fields until the Registrar supplies the real list. These are
    // ordinary rows — the admin can edit, reorder, or remove them from the UI.
    const GRAD_FIELDS = [
      ['year_graduated', 'Year Graduated', 'number', true, 1],
      ['program', 'Degree Program', 'text', true, 2],
      ['contact_email', 'Contact Email', 'email', true, 3],
      ['contact_number', 'Contact Number', 'tel', false, 4],
      ['current_employer', 'Current Employer', 'text', false, 5],
      ['purpose', 'Purpose of Application', 'textarea', false, 6],
    ];
    for (const [key, label, type, required, order] of GRAD_FIELDS) {
      await pool.query(
        `INSERT INTO grad_form_fields (field_key, label, field_type, is_required, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), field_type = VALUES(field_type),
           is_required = VALUES(is_required), sort_order = VALUES(sort_order)`,
        [key, label, type, required, order]
      );
    }
    console.log(`-> Seeded ${GRAD_FIELDS.length} default graduate form fields`);

    // =======================================================================
    // Category 2 — admin maintenance, reporting, export, analytics
    // =======================================================================
    console.log('\n--- Category 2: maintenance, reporting, analytics ---');

    // An admin creating a staff account sets a temporary password; the account
    // is then forced to choose its own on first login, so the admin-chosen
    // secret is never a long-lived credential.
    await addColumn('users', 'must_change_password', 'BOOLEAN NOT NULL DEFAULT FALSE');

    // Reporting filters and the analytics queries scan step_logs by date and
    // documents by status; these indexes keep that responsive as data grows.
    await addIndex('step_logs', 'idx_step_logs_started', 'timestamp_started');
    await addIndex('step_logs', 'idx_step_logs_action', 'action_taken');
    await addIndex('documents', 'idx_documents_status', 'current_status');
    await addIndex('documents', 'idx_documents_created', 'created_at');

    console.log('✅ Database migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
