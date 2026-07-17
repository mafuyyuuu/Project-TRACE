-- ============================================================
-- Project TRACE - Seed Data
-- Password for all users: trace2024
-- Bcrypt hash: $2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm
-- ============================================================

USE trace_db;

-- Registrar Admin (Overseer — AI Insights, Forecasting, User Management)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, verification_status, is_active) VALUES
  ('ADMIN001', 'admin@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Registrar Admin', 'admin', 'Admin Office', 'verified', TRUE);

-- Finance Clerk (Payment Verification Desk)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, verification_status, is_active) VALUES
  ('FINANCE001', 'finance@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Finance Officer', 'clerk', 'Finance', 'verified', TRUE);

-- Window 1 Clerk (Intake Scanner & Document Release)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, verification_status, is_active) VALUES
  ('WINDOW1001', 'window1@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Window 1 Clerk', 'clerk', 'Window 1', 'verified', TRUE);

-- College Secretary (Academic Evaluator & OCR Review)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, verification_status, is_active) VALUES
  ('SEC001', 'secretary@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'College Secretary', 'clerk', 'Secretary', 'verified', TRUE);

-- Sample Student Account
INSERT INTO users (student_id, email, password_hash, full_name, role, user_type, course, verification_status, is_active) VALUES
  ('STU2024001', 'student@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Ana Reyes', 'student', 'student', 'BS Information Technology', 'verified', TRUE);
