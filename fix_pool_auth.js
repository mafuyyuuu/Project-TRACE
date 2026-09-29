const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const pwdQueryRepl = `
    const pwdRows = await userModel.getProfileById(userId);
    if (!pwdRows || pwdRows.length === 0) throw notFound('User not found.');
    // getProfileById does not select password_hash. I will use a new method or existing one.
    // wait, findActiveByStudentId returns the full row including password_hash.
    const userRow = await userModel.findActiveByStudentId(pwdRows[0].student_id);
    if (!userRow || userRow.length === 0) throw notFound('User not found.');
    const match = await bcrypt.compare(current_password, userRow[0].password_hash);
`;
content = content.replace(
  /const \[pwdRows\] = await pool\.query\('SELECT password_hash FROM users WHERE id = \?', \[userId\]\);\n    if \(!pwdRows \|\| pwdRows\.length === 0\) throw notFound\('User not found\.'\);\n    const match = await bcrypt\.compare\(current_password, pwdRows\[0\]\.password_hash\);/,
  pwdQueryRepl
);

const userQueryRepl = `
    const userRows = await userModel.getProfileById(userId);
`;
content = content.replace(
  "const [userRows] = await pool.query('SELECT email, full_name FROM users WHERE id = ?', [userId]);",
  userQueryRepl
);

fs.writeFileSync(file, content);
