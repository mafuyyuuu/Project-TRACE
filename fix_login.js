const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const lockCheck = `
  const secRows = await userModel.getLoginSecurity(employee_id);
  if (secRows.length > 0) {
    const sec = secRows[0];
    if (sec.locked_until && new Date(sec.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(sec.locked_until) - new Date()) / 60000);
      throw badRequest(\`Account locked. Try again in \${minutesLeft} minute(s).\`);
    }
  }
`;

content = content.replace(
  '  if (!employee_id || !password) {',
  lockCheck + '\n  if (!employee_id || !password) {'
);

const handleFailedLogin = `
    if (secRows.length > 0) {
      const sec = secRows[0];
      const attempts = sec.failed_login_attempts + 1;
      if (attempts >= 5) {
        const until = new Date(Date.now() + 15 * 60000);
        await userModel.lockAccount(sec.id, until);
        throw unauthorized('Account locked for 15 minutes due to too many failed attempts.');
      } else {
        await userModel.incrementFailedLogin(sec.id);
        throw unauthorized(\`Invalid ID or password. Attempt \${attempts} of 5.\`);
      }
    }
    throw unauthorized('Invalid ID or password.');
`;

content = content.replace(
  "    throw unauthorized('Invalid ID or password.');",
  handleFailedLogin
);

const handleSuccessLogin = `
  if (secRows.length > 0 && (secRows[0].failed_login_attempts > 0 || secRows[0].locked_until)) {
    await userModel.resetLoginSecurity(secRows[0].id);
  }
`;

content = content.replace(
  "  if (existingSessions.length >= 3) {",
  handleSuccessLogin + "\n  if (existingSessions.length >= 3) {"
);

fs.writeFileSync(file, content);
