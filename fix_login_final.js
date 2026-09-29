const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const updatedLogin = `
async function login({ employee_id, password }, ipAddress, userAgent) {

  const secRows = await userModel.getLoginSecurity(employee_id);
  if (secRows.length > 0) {
    const sec = secRows[0];
    if (sec.locked_until && new Date(sec.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(sec.locked_until) - new Date()) / 60000);
      throw badRequest(\`Account locked. Try again in \${minutesLeft} minute(s).\`);
    }
  }

  if (!employee_id || !password) {
    throw badRequest('Employee ID and password are required.');
  }

  const rows = await userModel.findActiveByStudentId(employee_id);
  
  const handleFail = async () => {
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
  };

  if (rows.length === 0) {
    await handleFail();
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    await handleFail();
  }

  if (user.role === 'student' && user.verification_status !== 'verified') {
    throw forbidden(\`Account is \${user.verification_status}.\`);
  }
`;

content = content.replace(
  /async function login\(\{ employee_id, password \}, ipAddress, userAgent\) \{[\s\S]*?throw forbidden\(`Account is \$\{user\.verification_status\}\.`\);\n  \}/,
  updatedLogin
);

fs.writeFileSync(file, content);
