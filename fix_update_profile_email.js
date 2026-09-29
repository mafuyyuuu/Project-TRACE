const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const updatedUpdate = `
async function updateProfile(userId, { phone_number, email, course, password, current_password, ...profileFields }) {
  const fields = {};
  
  const users = await userModel.getProfileById(userId);
  if (!users || users.length === 0) throw notFound('User not found.');
  const currentUser = users[0];

  const emailChanged = (email !== undefined && email !== '' && email !== currentUser.email);

  if (emailChanged || password) {
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
`;

content = content.replace(
  /async function updateProfile\(userId, \{ phone_number, email, course, password, current_password, \.\.\.profileFields \}\) \{\n  const fields = \{\};\n  \n  if \(\(email !== undefined && email !== ''\) \|\| password\) \{\n    if \(!current_password\) \{\n      throw badRequest\('Current password is required to change email or password\.'\);\n    \}\n    const \[pwdRows\] = await pool\.query\('SELECT password_hash FROM users WHERE id = \?', \[userId\]\);\n    if \(!pwdRows \|\| pwdRows\.length === 0\) throw notFound\('User not found\.'\);\n    const match = await bcrypt\.compare\(current_password, pwdRows\[0\]\.password_hash\);\n    if \(!match\) \{\n      throw unauthorized\('Incorrect current password\.'\);\n    \}\n  \}/,
  updatedUpdate
);

fs.writeFileSync(file, content);
