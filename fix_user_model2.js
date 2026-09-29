const fs = require('fs');
let file = 'backend/src/models/user.model.js';
let content = fs.readFileSync(file, 'utf8');

const upsertProfileFunc = `
function upsertProfile(userId, profile, executor = pool) {
  return executor.query(
    \`INSERT INTO student_profiles (
      user_id, extension_name, birth_date, place_of_birth, sex, civil_status, maiden_name,
      home_address, last_attendance_year, is_transfer_student, previous_school,
      elem_school, elem_grad_year, jhs_school, jhs_grad_year, shs_school, shs_grad_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      extension_name = VALUES(extension_name),
      birth_date = VALUES(birth_date),
      place_of_birth = VALUES(place_of_birth),
      sex = VALUES(sex),
      civil_status = VALUES(civil_status),
      maiden_name = VALUES(maiden_name),
      home_address = VALUES(home_address),
      last_attendance_year = VALUES(last_attendance_year),
      is_transfer_student = VALUES(is_transfer_student),
      previous_school = VALUES(previous_school),
      elem_school = VALUES(elem_school),
      elem_grad_year = VALUES(elem_grad_year),
      jhs_school = VALUES(jhs_school),
      jhs_grad_year = VALUES(jhs_grad_year),
      shs_school = VALUES(shs_school),
      shs_grad_year = VALUES(shs_grad_year)\`,
    [
      userId,
      profile.extension_name || null,
      profile.birth_date || null,
      profile.place_of_birth || null,
      profile.sex || null,
      profile.civil_status || null,
      profile.maiden_name || null,
      profile.home_address || null,
      profile.last_attendance_year || null,
      profile.is_transfer_student ? 1 : 0,
      profile.previous_school || null,
      profile.elem_school || null,
      profile.elem_grad_year || null,
      profile.jhs_school || null,
      profile.jhs_grad_year || null,
      profile.shs_school || null,
      profile.shs_grad_year || null
    ]
  );
}
`;

if (!content.includes('upsertProfile')) {
  content = content.replace(
    'module.exports = {',
    upsertProfileFunc + '\nmodule.exports = {\n  upsertProfile,'
  );
  fs.writeFileSync(file, content);
}
