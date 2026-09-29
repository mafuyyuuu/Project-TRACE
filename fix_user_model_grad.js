const fs = require('fs');
let file = 'backend/src/models/user.model.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "'SELECT id, student_id, email, full_name, role, user_type, desk_assignment, is_active, phone_number, course, college_id, id_proof_path, enrollment_status, study_load, must_change_password, profile_picture, created_at FROM users WHERE id = ?'",
  "'SELECT u.id, u.student_id, u.email, u.full_name, u.role, u.user_type, u.desk_assignment, u.is_active, u.phone_number, u.course, u.college_id, u.id_proof_path, u.enrollment_status, u.study_load, u.must_change_password, u.profile_picture, u.created_at, (SELECT COUNT(*) FROM grad_applications WHERE student_id = u.id) > 0 AS has_grad_application FROM users u WHERE u.id = ?'"
);

content = content.replace(
  "'SELECT * FROM users WHERE student_id = ? AND is_active = TRUE'",
  "'SELECT u.*, (SELECT COUNT(*) FROM grad_applications WHERE student_id = u.id) > 0 AS has_grad_application FROM users u WHERE u.student_id = ? AND u.is_active = TRUE'"
);

fs.writeFileSync(file, content);
