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

-- ============================================================
-- College Secretaries (One per College — 7 Colleges at PLP)
-- desk_assignment = 'Secretary' is required for RBAC routing.
-- Each secretary is tied to a specific college.
-- ============================================================

-- College of Computer Studies (CCS)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-CCS001', 'sec.ccs@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'CCS Secretary', 'clerk', 'Secretary', 'College of Computer Studies', 'verified', TRUE);

-- College of Nursing (CON)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-CON001', 'sec.con@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'CON Secretary', 'clerk', 'Secretary', 'College of Nursing', 'verified', TRUE);

-- College of International Hospitality Management (CIHM)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-CIHM001', 'sec.cihm@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'CIHM Secretary', 'clerk', 'Secretary', 'College of International Hospitality Management', 'verified', TRUE);

-- College of Engineering (COE)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-COE001', 'sec.coe@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'COE Secretary', 'clerk', 'Secretary', 'College of Engineering', 'verified', TRUE);

-- College of Education (CED)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-CED001', 'sec.ced@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'CED Secretary', 'clerk', 'Secretary', 'College of Education', 'verified', TRUE);

-- College of Arts and Sciences (CAS)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-CAS001', 'sec.cas@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'CAS Secretary', 'clerk', 'Secretary', 'College of Arts and Sciences', 'verified', TRUE);

-- College of Business and Accountancy (CBA)
INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, course, verification_status, is_active) VALUES
  ('SEC-CBA001', 'sec.cba@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'CBA Secretary', 'clerk', 'Secretary', 'College of Business and Accountancy', 'verified', TRUE);

-- ============================================================
-- Sample Student Account
-- ============================================================
INSERT INTO users (student_id, email, password_hash, full_name, role, user_type, course, verification_status, is_active) VALUES
  ('STU2024001', 'student@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Ana Reyes', 'student', 'student', 'BS Information Technology', 'verified', TRUE);
