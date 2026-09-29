const fs = require('fs');
const file = 'backend/src/models/user.model.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "'SELECT id, student_id, email, full_name, role, user_type, desk_assignment, is_active, phone_number, course, enrollment_status, study_load, must_change_password, profile_picture, created_at FROM users WHERE id = ?',",
  "'SELECT id, student_id, email, full_name, role, user_type, desk_assignment, is_active, phone_number, course, college_id, id_proof_path, enrollment_status, study_load, must_change_password, profile_picture, created_at FROM users WHERE id = ?',"
);

// Also update the full admin lookup list (getUsers) to include college_id if we want
content = content.replace(
  "SELECT id, student_id, full_name, email, course, role, verification_status, enrollment_status, study_load, is_active, created_at",
  "SELECT id, student_id, full_name, email, course, college_id, role, verification_status, enrollment_status, study_load, is_active, created_at"
);

fs.writeFileSync(file, content);
