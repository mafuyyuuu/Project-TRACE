const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const updatedUpdateProfile = `
async function updateProfile(userId, { phone_number, email, course, password, current_password, ...profileFields }) {
  const fields = {};
  
  if (email !== undefined || password) {
    if (!current_password) {
      throw badRequest('Current password is required to change email or password.');
    }
    const users = await userModel.getProfileById(userId);
    const userRow = await userModel.findActiveByStudentId(users[0].student_id);
    const storedHash = userRow[0].password_hash || (await userModel.findExistingByStudentId(users[0].student_id))[0].password_hash; // wait, findActive doesn't return password_hash.
    // Let's use a raw query or add a method. Wait, findActiveByStudentId returns full users row usually. But does it return password_hash? Let's assume it doesn't and write a raw query.
  }
`;

// It's better to just do a direct query for current hash.
const rewriteUpdate = `
async function updateProfile(userId, { phone_number, email, course, password, current_password, ...profileFields }) {
  const fields = {};
  
  if ((email !== undefined && email !== '') || password) {
    if (!current_password) {
      throw badRequest('Current password is required to change email or password.');
    }
    const [pwdRows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!pwdRows || pwdRows.length === 0) throw notFound('User not found.');
    const match = await bcrypt.compare(current_password, pwdRows[0].password_hash);
    if (!match) {
      throw unauthorized('Incorrect current password.');
    }
  }

  if (phone_number !== undefined) fields.phone_number = phone_number;
  if (email !== undefined && email !== '') fields.email = email;
  if (course !== undefined) fields.course = course;
  
  if (password) {
    validatePassword(password);
    await checkPasswordHistory(userId, password);
    fields.password_hash = await bcrypt.hash(password, 10);
    fields.must_change_password = false;
    await userModel.addPasswordHistory(userId, fields.password_hash);
    
    // SEC-07 Email notification
    const [userRows] = await pool.query('SELECT email, full_name FROM users WHERE id = ?', [userId]);
    if (userRows[0] && userRows[0].email) {
      const nodemailer = require('nodemailer'); // Assumes we use the same mailer. We have notification.service.js
      const notifications = require('./notification.service');
      await notifications.notifyByEmail({
        email: userRows[0].email,
        title: 'Password Changed',
        message: 'Your Project TRACE password was recently changed. If this was not you, please contact the administrator immediately.'
      });
    }
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
  /async function updateProfile\([\s\S]*?return \{ message: 'Profile updated successfully\.' \};\n\}/,
  rewriteUpdate
);

fs.writeFileSync(file, content);
