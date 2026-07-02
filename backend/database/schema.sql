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
  desk_assignment VARCHAR(100),
  id_proof_path VARCHAR(500),
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  is_active BOOLEAN DEFAULT TRUE,
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
  current_status ENUM('pending_payment','submitted','processing','approved','rejected','released') DEFAULT 'pending_payment',
  payment_status ENUM('UNPAID', 'PAID') DEFAULT 'UNPAID',
  assigned_clerk_id INT,
  file_path VARCHAR(500),
  original_filename VARCHAR(255),
  ocr_raw_text TEXT,
  ocr_extracted_data JSON,
  payment_reference_id VARCHAR(255),
  checkout_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_clerk_id) REFERENCES users(id) ON DELETE SET NULL
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
