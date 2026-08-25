-- ============================================================
-- Project TRACE - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS trace_db;
USE trace_db;

-- Users table: students, clerks, and admins
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE,
  email VARCHAR(255),
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
  -- Uploaded avatar filename. Served through the authenticated /api/files
  -- route like every other upload, never from a public static path.
  profile_picture VARCHAR(500),
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  course VARCHAR(100),
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  -- Set when an admin creates a staff account with a temporary password;
  -- the user must choose their own before doing anything else.
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Documents table: uploaded documents with OCR data
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(64) UNIQUE NOT NULL,
  student_id VARCHAR(50),
  student_name VARCHAR(255),
  document_type VARCHAR(100),
  current_status VARCHAR(50) DEFAULT 'pending_payment',
  payment_status ENUM('UNPAID', 'PAID') DEFAULT 'UNPAID',
  assigned_clerk_id INT,
  file_path VARCHAR(500),
  receipt_image_path VARCHAR(500),
  official_receipt_path VARCHAR(500),
  original_filename VARCHAR(255),
  ocr_raw_text TEXT,
  ocr_extracted_data JSON,
  payment_reference_id VARCHAR(255),
  gcash_reference_no VARCHAR(255),
  amount DECIMAL(10,2) DEFAULT 150.00,
  copies INT DEFAULT 1,
  ocr_confidence_score DECIMAL(5,2),
  purpose VARCHAR(255),
  checkout_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_clerk_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table: in-app alerts
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
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

CREATE TABLE IF NOT EXISTS colleges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  short_code VARCHAR(20) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- fee_rule selects the calculation in backend/src/utils/pricing.js. Flat fees
-- are admin-editable; per_semester_block (TOR) is not a single number, so its
-- rule stays in code.
CREATE TABLE IF NOT EXISTS document_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  base_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  fee_rule ENUM('flat', 'per_semester_block') NOT NULL DEFAULT 'flat',
  requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_label VARCHAR(255) NULL,
  attachment_helper VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
