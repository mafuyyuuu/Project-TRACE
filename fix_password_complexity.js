const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const helpers = `
function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/;
  if (!regex.test(password)) {
    throw badRequest('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
  }
}

async function checkPasswordHistory(userId, newPassword) {
  const history = await userModel.getPasswordHistory(userId);
  for (const row of history) {
    if (await bcrypt.compare(newPassword, row.password_hash)) {
      throw badRequest('You cannot reuse any of your last 3 passwords.');
    }
  }
}
`;

content = content.replace(
  'const path = require(\'path\');',
  'const path = require(\'path\');\n' + helpers
);

// In register:
content = content.replace(
  "  if (password.length < 6) {\n    throw badRequest('Password must be at least 6 characters.');\n  }",
  "  validatePassword(password);"
);

// We need to insert into password history on register.
// wait, register doesn't have the user ID until after insert.
content = content.replace(
  "  return { message: 'Registration submitted', user: { student_id, user_type: derivedType } };",
  "  const newRows = await userModel.findActiveByStudentId(student_id);\n  if (newRows.length > 0) await userModel.addPasswordHistory(newRows[0].id, password_hash);\n  return { message: 'Registration submitted', user: { student_id, user_type: derivedType } };"
);

// In resetPassword:
content = content.replace(
  "  const password_hash = await bcrypt.hash(password, 10);",
  "  validatePassword(password);\n  await checkPasswordHistory(reset.user_id, password);\n  const password_hash = await bcrypt.hash(password, 10);\n  await userModel.addPasswordHistory(reset.user_id, password_hash);"
);

fs.writeFileSync(file, content);
