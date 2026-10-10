-- ============================================================
-- Project TRACE - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS trace_db;
USE trace_db;

-- One-time data changes are recorded so reruns preserve later Admin edits.
CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_key VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS colleges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  short_code VARCHAR(20) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- No invented program seeds. Admin enters the Registrar-approved catalog.
CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  college_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY programs_college_name (college_id, name),
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Users table: students, clerks, and admins
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE,
  email VARCHAR(255),
  email_verified_at DATETIME NULL,
  program VARCHAR(150) NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('student', 'clerk', 'admin') NOT NULL DEFAULT 'student',
  user_type ENUM('student', 'alumni') DEFAULT 'student',
  -- Two orthogonal axes: a student can be Irregular *and* Active, whereas
  -- graduated / dropout / transferred are mutually exclusive outcomes.
  enrollment_status ENUM('active', 'graduated', 'dropout', 'transferred') NOT NULL DEFAULT 'active',
  study_load ENUM('regular', 'irregular') NOT NULL DEFAULT 'regular',
  desk_assignment VARCHAR(100),
  id_proof_path VARCHAR(500),
  registration_proof_unavailable BOOLEAN NOT NULL DEFAULT FALSE,
  registration_proof_reason VARCHAR(500) NULL,
  -- Uploaded avatar filename. Served through the authenticated /api/files
  -- route like every other upload, never from a public static path.
  profile_picture VARCHAR(500),
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verification_reason VARCHAR(300) NULL,
  course VARCHAR(150),
  college_id INT NULL,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL,
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL DEFAULT NULL,
  token_version INT NOT NULL DEFAULT 0,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pending_email VARCHAR(255) NULL,
  -- Email-change codes use E:<six digits>; older shared codes are not trusted.
  email_otp VARCHAR(10) NULL,
  email_otp_expires TIMESTAMP NULL DEFAULT NULL,
  login_otp VARCHAR(6) NULL,
  login_otp_expires TIMESTAMP NULL DEFAULT NULL,
  -- Set when an admin creates a staff account with a temporary password;
  -- the user must choose their own before doing anything else.
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clerk MFA proofs contain only random-token hashes and UTC epoch expiry.
CREATE TABLE IF NOT EXISTS onboarding_guides (
  user_id INT PRIMARY KEY,
  shown_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trusted_browsers (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  token_version INT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX trusted_browsers_user_expiry (user_id, expires_at_ms),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Documents table: uploaded documents with OCR data

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT PRIMARY KEY,
  extension_name VARCHAR(20),
  birth_date DATE,
  place_of_birth VARCHAR(255),
  sex ENUM('Male', 'Female'),
  civil_status ENUM('Single', 'Married', 'Widowed', 'Divorced', 'Separated'),
  maiden_name VARCHAR(255),
  home_address VARCHAR(500),
  graduation_year INT NULL,
  year_started INT NULL,
  study_years_confirmed_at DATETIME NULL,
  last_attendance_year INT,
  is_transfer_student BOOLEAN DEFAULT FALSE,
  previous_school VARCHAR(255),
  elem_school VARCHAR(255),
  elem_grad_year INT,
  jhs_school VARCHAR(255),
  jhs_grad_year INT,
  shs_school VARCHAR(255),
  shs_grad_year INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS password_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  pricing_snapshot JSON NULL,
  fee_breakdown JSON NULL,
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(64) UNIQUE NOT NULL,
  document_sequence_number VARCHAR(255) NULL,
  student_id VARCHAR(50),
  student_name VARCHAR(255),
  document_type VARCHAR(100),
  -- Pipeline vocabulary lives in src/utils/documentStatus.js, not in an ENUM:
  -- a VARCHAR lets the pipeline change without an ALTER, and the constants
  -- module is what actually enforces the values (it also covers the Python
  -- engine and the React queues, which a database ENUM never could).
  current_status VARCHAR(50) DEFAULT 'PENDING_W1_INTAKE',
  -- What the Secretary told the student to expect, set when work begins.
  estimated_ready_date DATE,
  payment_status ENUM('UNPAID', 'PAID') DEFAULT 'UNPAID',
  assigned_clerk_id INT,
  file_path VARCHAR(500),
  receipt_image_path VARCHAR(500),
  is_same_day BOOLEAN NOT NULL DEFAULT FALSE,
  official_receipt_path VARCHAR(500),
  payment_cleared_at TIMESTAMP NULL,
  or_earliest_issue_date DATE NULL,
  or_uploaded_at TIMESTAMP NULL,
  -- Official Receipt issued by Finance. For a walk-in this is the only proof
  -- of payment that exists, and it is what the student shows at Window 1.
  or_number VARCHAR(100),
  or_date DATE,
  logged_by_clerk_id INT,
  original_filename VARCHAR(255),
  ocr_raw_text TEXT,
  ocr_extracted_data JSON,
  payment_reference_id VARCHAR(255),
  gcash_reference_no VARCHAR(255),
  amount DECIMAL(10,2) DEFAULT 150.00,
  -- The basis for the amount. The Secretary prices from the printed output, so
  -- an amount without these is an unexplainable charge.
  page_count INT,
  pricing_notes TEXT,
  priced_by_clerk_id INT,
  priced_at DATETIME,
  stub_issued_at DATETIME,
  copies INT DEFAULT 1,
  ocr_confidence_score DECIMAL(5,2),
  purpose VARCHAR(255),
  checkout_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_clerk_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (priced_by_clerk_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (logged_by_clerk_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table: in-app alerts
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  action_url VARCHAR(255) NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step logs: audit trail for every document action
CREATE TABLE IF NOT EXISTS step_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  clerk_id INT,
  action_taken VARCHAR(100) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  timestamp_started DATETIME DEFAULT CURRENT_TIMESTAMP,
  timestamp_completed DATETIME,
  notes TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (clerk_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================================================
-- Category 1 — multi-document requests, reference data, graduate application
-- ===========================================================================

-- Documents sharing a request_group_id were requested and paid for together,
-- but each keeps its own status and desk routing.
ALTER TABLE documents ADD COLUMN request_group_id VARCHAR(64) NULL AFTER tracking_number;
CREATE INDEX idx_documents_request_group ON documents (request_group_id);



-- fee_rule selects the calculation in backend/src/utils/pricing.js. Flat fees
-- are admin-editable; per_semester_block (TOR) is not a single number, so its
-- rule stays in code.
CREATE TABLE IF NOT EXISTS document_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  base_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  rental_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  special_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fee_rule ENUM('flat', 'per_semester_block') NOT NULL DEFAULT 'flat',
  requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_label VARCHAR(255) NULL,
  attachment_helper VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  available_to ENUM('student', 'alumni', 'both') NOT NULL DEFAULT 'both',
  is_repeatable BOOLEAN NOT NULL DEFAULT TRUE,
  is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,
  requires_original BOOLEAN NOT NULL DEFAULT FALSE,
  registrar_attachment_rule ENUM('none', 'optional', 'required') NOT NULL DEFAULT 'none',
  is_same_day BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_type_colleges (
  document_type_id INT NOT NULL,
  college_id INT NOT NULL,
  PRIMARY KEY (document_type_id, college_id),
  FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
);

-- Admin-configurable Graduate Application form. Field definitions live in
-- grad_form_fields; answers are one row each, so adding a field never needs
-- a migration.
CREATE TABLE IF NOT EXISTS grad_form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type ENUM('text', 'textarea', 'number', 'date', 'select', 'email', 'tel') NOT NULL DEFAULT 'text',
  options JSON NULL,
  placeholder VARCHAR(255) NULL,
  help_text VARCHAR(255) NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grad_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  status ENUM('submitted', 'under_review', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
  reviewed_by INT NULL,
  notes TEXT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_grad_applications_student (student_id)
);

CREATE TABLE IF NOT EXISTS grad_application_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  value TEXT NULL,
  UNIQUE KEY uq_application_field (application_id, field_key),
  FOREIGN KEY (application_id) REFERENCES grad_applications(id) ON DELETE CASCADE
);

-- NOTE: reference data (colleges, document_types) and the default graduate
-- form fields are seeded by backend/database/migration.js, which is idempotent
-- and safe to re-run. Run it after loading this schema.

-- Reporting and analytics scan these columns constantly.
CREATE INDEX idx_step_logs_started ON step_logs (timestamp_started);
CREATE INDEX idx_step_logs_action ON step_logs (action_taken);
CREATE INDEX idx_documents_status ON documents (current_status);
CREATE INDEX idx_documents_created ON documents (created_at);

-- Batch 8: browser recognition (not JWT sessions)
CREATE TABLE IF NOT EXISTS user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_hash CHAR(64) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_device (user_id, device_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

-- Pricing schedules and historical request snapshots (CN-15/CN-08).
CREATE TABLE IF NOT EXISTS document_fee_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_type_id INT NOT NULL,
  college_id INT NULL,
  college_key INT GENERATED ALWAYS AS (IFNULL(college_id, 0)) STORED,
  base_fee DECIMAL(10,2) NULL,
  fee_rule ENUM('flat', 'per_semester_block') NULL,
  rental_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  fee_items JSON NOT NULL,
  UNIQUE KEY fee_schedule_type_college (document_type_id, college_key),
  FOREIGN KEY (document_type_id) REFERENCES document_types(id),
  FOREIGN KEY (college_id) REFERENCES colleges(id)
) ENGINE=InnoDB;

-- Authenticator enrollment, recovery and login challenges
CREATE TABLE IF NOT EXISTS authenticator_credentials (
    user_id INT PRIMARY KEY,
    active_secret TEXT NULL,
    pending_secret TEXT NULL,
    pending_expires_ms BIGINT NULL,
    pending_version INT NULL,
    last_counter BIGINT NOT NULL DEFAULT -1,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until_ms BIGINT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS authenticator_recovery_codes (
    code_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    used_at TIMESTAMP NULL,
    INDEX authenticator_recovery_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS authenticator_challenges (
    nonce_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    token_version INT NOT NULL,
    method VARCHAR(20) NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX authenticator_challenge_user (user_id, expires_at_ms),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS session_revocations (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  INDEX session_revocation_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- Case-specific pertinent documents requested by Registrar
CREATE TABLE IF NOT EXISTS supporting_document_types (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_attachment_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY, document_id INT NOT NULL, label VARCHAR(255) NOT NULL,
    instructions VARCHAR(2000) NOT NULL, status ENUM('requested','uploaded','accepted','rejected') NOT NULL DEFAULT 'requested',
    catalog_id INT NULL, identity_key VARCHAR(100) NULL, replacement_of INT NULL, superseded_at TIMESTAMP NULL,
    requested_by INT NOT NULL, reviewed_by INT NULL, review_notes VARCHAR(2000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP NULL,
    CONSTRAINT attachment_catalog_fk FOREIGN KEY (catalog_id) REFERENCES supporting_document_types(id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id), FOREIGN KEY (reviewed_by) REFERENCES users(id), INDEX (document_id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_attachment_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY, requirement_id INT NOT NULL, uploaded_by INT NOT NULL,
    file_path VARCHAR(500) NOT NULL, original_filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requirement_id) REFERENCES request_attachment_requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id), INDEX (requirement_id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  kind ENUM('signup','change') NOT NULL, email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, token_version INT NOT NULL,
  expires_at DATETIME NOT NULL, used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX email_links_user (user_id, kind, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY, student_user_id INT NOT NULL, sender_id INT NOT NULL,
  message VARCHAR(2000) NOT NULL, read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX support_conversation (student_user_id, id),
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB;


-- Durable numbering; committed numbers survive request cancellation.
CREATE TABLE IF NOT EXISTS document_request_counters (
  student_id VARCHAR(50) NOT NULL, document_type VARCHAR(255) NOT NULL,
  last_number INT UNSIGNED NOT NULL DEFAULT 0, original_issued BOOLEAN NOT NULL DEFAULT FALSE,
  original_recorded_by INT NULL, original_recorded_at DATETIME NULL, original_notes VARCHAR(2000) NULL,
  PRIMARY KEY (student_id, document_type)
) ENGINE=InnoDB;

-- Configurable bodies; an empty body uses the branded default.
CREATE TABLE IF NOT EXISTS system_templates (
  id INT AUTO_INCREMENT PRIMARY KEY, template_key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL, content LONGTEXT NULL,
  font_family VARCHAR(100) DEFAULT 'sans-serif', font_size VARCHAR(20) DEFAULT '12px',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
INSERT IGNORE INTO system_templates (template_key, name) VALUES
  ('payment_slip', 'Order of Payment (Slip)'), ('email_notice', 'Standard Email Notice');

CREATE TABLE IF NOT EXISTS staff_authenticator_setup (
  user_id INT PRIMARY KEY, code_hash CHAR(64) NOT NULL, issued_by INT NOT NULL,
  token_version INT NOT NULL, expires_at_ms BIGINT NOT NULL,
  attempts INT NOT NULL DEFAULT 0, consumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_messages (
  id INT AUTO_INCREMENT PRIMARY KEY, document_id INT NOT NULL, sender_id INT NOT NULL,
  message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, read_at TIMESTAMP NULL,
  INDEX idx_document_messages_doc (document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- Unified support ticket workflow; legacy message stores remain read-only.
CREATE TABLE IF NOT EXISTS support_settings (
    id INT PRIMARY KEY, settings JSON NOT NULL, updated_by INT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), FOREIGN KEY (updated_by) REFERENCES users(id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_availability (
    user_id INT PRIMARY KEY, available BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY, student_user_id INT NOT NULL, document_id INT NULL,
    subject VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL DEFAULT 'general',
    state ENUM('FAQ_ASSISTANCE','QUEUED','IN_PROGRESS','AWAITING_STUDENT','RESOLVED') NOT NULL,
    assigned_to INT NULL, queued_at DATETIME(3) NULL, claimed_at DATETIME(3) NULL,
    reply_requested_at DATETIME(3) NULL, reply_clock JSON NULL, warned_at DATETIME(3) NULL,
    resolved_at DATETIME(3) NULL, imported BOOLEAN NOT NULL DEFAULT FALSE, import_key VARCHAR(100) NULL UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    open_general_owner INT GENERATED ALWAYS AS (CASE WHEN category <> 'linked' AND state <> 'RESOLVED' THEN student_user_id ELSE NULL END) STORED,
    live_clerk INT GENERATED ALWAYS AS (CASE WHEN state = 'IN_PROGRESS' THEN assigned_to ELSE NULL END) STORED,
    UNIQUE KEY support_one_open_general (open_general_owner), UNIQUE KEY support_one_live_clerk (live_clerk),
    INDEX support_owner_cursor(student_user_id,id), INDEX support_queue(state,queued_at,id), INDEX support_document(document_id),
    FOREIGN KEY (student_user_id) REFERENCES users(id), FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, sender_id INT NULL,
    kind ENUM('message','system','requirement') NOT NULL DEFAULT 'message', message VARCHAR(2000) NOT NULL,
    metadata JSON NULL, client_key VARCHAR(100) NULL, payload_hash CHAR(64) NULL, import_key VARCHAR(100) NULL UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY support_send_retry(sender_id,client_key), INDEX support_message_cursor(ticket_id,id),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id), FOREIGN KEY (sender_id) REFERENCES users(id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_ticket_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, message_id BIGINT NOT NULL, filename VARCHAR(100) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL, size_bytes INT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES support_ticket_messages(id), INDEX(message_id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_ticket_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NULL, actor_id INT NULL, event_type VARCHAR(100) NOT NULL,
    event_key VARCHAR(100) NOT NULL UNIQUE, data JSON NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX support_event_timeline(ticket_id,id), INDEX support_event_period(created_at,event_type),
    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id), FOREIGN KEY(actor_id) REFERENCES users(id)
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_attachment_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, requirement_id INT NULL,
    document_id INT NULL, actor_id INT NULL, event_type VARCHAR(50) NOT NULL,
    snapshot JSON NOT NULL, created_at DATETIME(3) NOT NULL,
    FOREIGN KEY (requirement_id) REFERENCES request_attachment_requirements(id) ON DELETE SET NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id), INDEX (requirement_id,id)
  ) ENGINE=InnoDB;

INSERT INTO support_settings(id,settings) VALUES (1,'{"weekdays":[1,2,3,4],"open_minute":480,"close_minute":960,"closed_dates":[],"warning_minutes":3,"timeout_minutes":5}') ON DUPLICATE KEY UPDATE id=id;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL,
  used_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX password_reset_user (user_id,used_at,expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL, provider VARCHAR(50) NOT NULL DEFAULT 'manual',
  instructions TEXT NULL, requires_reference BOOLEAN NOT NULL DEFAULT TRUE,
  reference_label VARCHAR(150) NULL, requires_proof BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS study_year_events (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, actor_id INT NOT NULL,
    event_type ENUM('initial', 'correction') NOT NULL, previous_values JSON NOT NULL, saved_values JSON NOT NULL,
    reason VARCHAR(1000) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX study_year_events_user (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_review_events (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, reviewer_id INT NOT NULL,
    decision ENUM('verified', 'rejected') NOT NULL, evidence_basis VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB;
