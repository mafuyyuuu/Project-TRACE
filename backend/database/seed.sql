-- ============================================================
-- Project TRACE - Seed Data
-- Password for all users: trace2024
-- ============================================================

USE trace_db;

INSERT INTO users (student_id, email, password_hash, full_name, role, desk_assignment, is_active) VALUES
  ('ADMIN001', 'admin@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Registrar Admin', 'admin', 'Admin Office', TRUE),
  ('CLERK001', 'clerk.receiving@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Maria Santos', 'clerk', 'Receiving Desk', TRUE),
  ('CLERK002', 'clerk.records@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Juan Dela Cruz', 'clerk', 'Records Desk', TRUE),
  ('STU2024001', 'student@trace.edu', '$2b$10$l1XbhJYr7EQzggm7AE89weNjzuIj7kV6GKhnNguYnMzQ1J89TKuIm', 'Ana Reyes', 'student', NULL, TRUE);
