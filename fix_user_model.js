const fs = require('fs');
let file = 'backend/src/models/user.model.js';
let content = fs.readFileSync(file, 'utf8');

const updatedGetProfile = `function getProfileById(userId, executor = pool) {
  return executor
    .query(
      \`SELECT u.id, u.student_id, u.email, u.full_name, u.role, u.user_type, u.desk_assignment, 
              u.is_active, u.phone_number, u.course, u.college_id, u.id_proof_path, 
              u.enrollment_status, u.study_load, u.must_change_password, u.profile_picture, u.created_at,
              p.extension_name, p.birth_date, p.place_of_birth, p.sex, p.civil_status, p.maiden_name,
              p.home_address, p.last_attendance_year, p.is_transfer_student, p.previous_school,
              p.elem_school, p.elem_grad_year, p.jhs_school, p.jhs_grad_year, p.shs_school, p.shs_grad_year
       FROM users u
       LEFT JOIN student_profiles p ON u.id = p.user_id
       WHERE u.id = ?\`,
      [userId]
    )
    .then(([rows]) => rows);
}`;

content = content.replace(
  /function getProfileById[\s\S]*?then\(\[rows\]\) => rows\);\n\}/,
  updatedGetProfile
);

fs.writeFileSync(file, content);
