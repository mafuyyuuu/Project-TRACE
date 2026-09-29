const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

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
    throw unauthorized('Invalid credentials.');
`;

content = content.replace(
  "    throw unauthorized('Invalid credentials.');",
  handleFailedLogin
);

// We should also replace the pending user message to match the test expects
content = content.replace(
  "    throw forbidden('Your account is pending verification. Please wait for an admin to approve your request.');",
  "    throw forbidden(`Account is ${user.verification_status}.`);"
);
// Actually the existing code in auth.service.js was `throw forbidden(\`Account is \${user.verification_status}.\`);` before, wait... I'll just change the test to match.

fs.writeFileSync(file, content);
