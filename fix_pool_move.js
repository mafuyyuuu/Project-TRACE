const fs = require('fs');

// 1. user.model.js
let modelFile = 'backend/src/models/user.model.js';
let modelContent = fs.readFileSync(modelFile, 'utf8');

const queryFns = `
function updateEmailOTP(userId, otp, expires, executor = pool) {
  return executor.query('UPDATE users SET email_otp = ?, email_otp_expires = ? WHERE id = ?', [otp, expires, userId]);
}

function clearEmailOTP(userId, executor = pool) {
  return executor.query('UPDATE users SET email_otp = NULL, email_otp_expires = NULL WHERE id = ?', [userId]);
}

function requestEmailChange(userId, email, otp, expires, executor = pool) {
  return executor.query('UPDATE users SET pending_email = ?, email_otp = ?, email_otp_expires = ? WHERE id = ?', [email, otp, expires, userId]);
}

function commitEmailChange(userId, email, executor = pool) {
  return executor.query('UPDATE users SET email = ?, pending_email = NULL, email_otp = NULL, email_otp_expires = NULL WHERE id = ?', [email, userId]);
}

function incrementTokenVersion(userId, executor = pool) {
  return executor.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
}
`;

modelContent = modelContent.replace('module.exports = {', queryFns + '\nmodule.exports = {');
modelContent = modelContent.replace('module.exports = {', 'module.exports = {\n  updateEmailOTP,\n  clearEmailOTP,\n  requestEmailChange,\n  commitEmailChange,\n  incrementTokenVersion,');
fs.writeFileSync(modelFile, modelContent);

// 2. auth.service.js
let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');

authContent = authContent.replace(
  "await pool.query('UPDATE users SET email_otp = ?, email_otp_expires = ? WHERE id = ?', [otp, expires, user.id]);",
  "await userModel.updateEmailOTP(user.id, otp, expires);"
);

authContent = authContent.replace(
  "await pool.query('UPDATE users SET email_otp = NULL, email_otp_expires = NULL WHERE id = ?', [user.id]);",
  "await userModel.clearEmailOTP(user.id);"
);

authContent = authContent.replace(
  "await pool.query(\n      'UPDATE users SET pending_email = ?, email_otp = ?, email_otp_expires = ? WHERE id = ?',\n      [email, otp, expires, userId]\n    );",
  "await userModel.requestEmailChange(userId, email, otp, expires);"
);

authContent = authContent.replace(
  "await pool.query(\n    'UPDATE users SET email = ?, pending_email = NULL, email_otp = NULL, email_otp_expires = NULL WHERE id = ?',\n    [user.pending_email, userId]\n  );",
  "await userModel.commitEmailChange(userId, user.pending_email);"
);

authContent = authContent.replace(
  "await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);",
  "await userModel.incrementTokenVersion(userId);"
);

fs.writeFileSync(authFile, authContent);

// 3. auth.service.test.cjs
let testFile = 'backend/src/services/__tests__/auth.service.test.cjs';
let testContent = fs.readFileSync(testFile, 'utf8');
const testSpies = `
  vi.spyOn(userModel, 'updateEmailOTP').mockResolvedValue([]);
  vi.spyOn(userModel, 'clearEmailOTP').mockResolvedValue([]);
  vi.spyOn(userModel, 'requestEmailChange').mockResolvedValue([]);
  vi.spyOn(userModel, 'commitEmailChange').mockResolvedValue([]);
  vi.spyOn(userModel, 'incrementTokenVersion').mockResolvedValue([]);
`;
testContent = testContent.replace("vi.spyOn(userModel, 'logSecurityEvent').mockResolvedValue([]);", "vi.spyOn(userModel, 'logSecurityEvent').mockResolvedValue([]);\n" + testSpies);
fs.writeFileSync(testFile, testContent);

