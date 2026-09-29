const fs = require('fs');

// Add model for security_logs
let modelFile = 'backend/src/models/user.model.js';
let modelContent = fs.readFileSync(modelFile, 'utf8');

const logFn = `
function logSecurityEvent(userId, eventType, ipAddress = null, userAgent = null, executor = pool) {
  return executor.query(
    'INSERT INTO security_logs (user_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
    [userId, eventType, ipAddress, userAgent]
  );
}

function getSecurityLogs(userId, executor = pool) {
  return executor.query(
    'SELECT event_type, ip_address, user_agent, created_at FROM security_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId]
  ).then(([rows]) => rows);
}
`;

modelContent = modelContent.replace(
  'module.exports = {',
  logFn + '\nmodule.exports = {'
);
modelContent = modelContent.replace(
  'module.exports = {',
  'module.exports = {\n  logSecurityEvent,\n  getSecurityLogs,'
);
fs.writeFileSync(modelFile, modelContent);


// Add calls in auth.service.js
let serviceFile = 'backend/src/services/auth.service.js';
let serviceContent = fs.readFileSync(serviceFile, 'utf8');

serviceContent = serviceContent.replace(
  "const token = jwt.sign(",
  "await userModel.logSecurityEvent(user.id, 'LOGIN', ipAddress, userAgent);\n  const token = jwt.sign("
);

serviceContent = serviceContent.replace(
  "await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);",
  "await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);\n  await userModel.logSecurityEvent(userId, 'LOGOUT_ALL');"
);

serviceContent = serviceContent.replace(
  "fields.password_hash = await bcrypt.hash(password, 10);",
  "fields.password_hash = await bcrypt.hash(password, 10);\n    await userModel.logSecurityEvent(userId, 'PASSWORD_CHANGE');"
);

serviceContent = serviceContent.replace(
  "if (email !== undefined && email !== '' && email !== currentUser.email) fields.email = email;",
  "if (email !== undefined && email !== '' && email !== currentUser.email) { fields.email = email; await userModel.logSecurityEvent(userId, 'EMAIL_CHANGE'); }"
);

fs.writeFileSync(serviceFile, serviceContent);
