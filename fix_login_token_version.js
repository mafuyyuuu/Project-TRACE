const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "course: user.course,",
  "course: user.course,\n      token_version: user.token_version || 1,"
);

const logoutAll = `
async function logoutAll(userId) {
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
  return { message: 'Successfully logged out of all devices.' };
}
`;

content = content.replace(
  "async function requestPasswordReset({ identifier }) {",
  logoutAll + "\nasync function requestPasswordReset({ identifier }) {"
);

content = content.replace(
  "requestPasswordReset,",
  "logoutAll,\n  requestPasswordReset,"
);

fs.writeFileSync(file, content);

let routesFile = 'backend/src/routes/auth.routes.js'; // wait, where are the routes?
