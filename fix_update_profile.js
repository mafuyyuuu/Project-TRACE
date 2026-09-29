const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const updatedFunc = `
async function updateProfile(userId, { phone_number, email, course, password, ...profileFields }) {
  const fields = {};
  if (phone_number !== undefined) fields.phone_number = phone_number;
  if (email !== undefined) fields.email = email;
  if (course !== undefined) fields.course = course;
  if (password) {
    fields.password_hash = await bcrypt.hash(password, 10);
    fields.must_change_password = false;
  }

  if (Object.keys(fields).length > 0) {
    await userModel.updateProfile(userId, fields);
  }

  // Handle student profile fields (PROF-01)
  const profileKeys = ['extension_name', 'birth_date', 'place_of_birth', 'sex', 'civil_status', 'maiden_name', 'home_address', 'last_attendance_year', 'is_transfer_student', 'previous_school', 'elem_school', 'elem_grad_year', 'jhs_school', 'jhs_grad_year', 'shs_school', 'shs_grad_year'];
  const hasProfileFields = profileKeys.some(key => profileFields[key] !== undefined);
  
  if (hasProfileFields) {
    await userModel.upsertProfile(userId, profileFields);
  }

  if (Object.keys(fields).length === 0 && !hasProfileFields) {
    throw badRequest('No fields to update.');
  }

  return { message: 'Profile updated successfully.' };
}
`;

content = content.replace(
  /async function updateProfile[\s\S]*?return \{ message: 'Profile updated successfully\.' \};\n\}/,
  updatedFunc
);

fs.writeFileSync(file, content);
