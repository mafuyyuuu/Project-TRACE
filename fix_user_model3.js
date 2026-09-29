const fs = require('fs');
let file = 'backend/src/models/user.model.js';
let content = fs.readFileSync(file, 'utf8');

const lockMethods = `
function getLoginSecurity(identifier, executor = pool) {
  return executor
    .query(
      'SELECT id, failed_login_attempts, locked_until FROM users WHERE student_id = ? OR email = ? LIMIT 1',
      [identifier, identifier]
    )
    .then(([rows]) => rows);
}

function incrementFailedLogin(userId, executor = pool) {
  return executor.query(
    'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?',
    [userId]
  );
}

function lockAccount(userId, until, executor = pool) {
  return executor.query(
    'UPDATE users SET locked_until = ? WHERE id = ?',
    [until, userId]
  );
}

function resetLoginSecurity(userId, executor = pool) {
  return executor.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
    [userId]
  );
}

function getPasswordHistory(userId, executor = pool) {
  return executor
    .query(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
      [userId]
    )
    .then(([rows]) => rows);
}

function addPasswordHistory(userId, hash, executor = pool) {
  return executor.query(
    'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)',
    [userId, hash]
  );
}
`;

content = content.replace(
  'module.exports = {',
  lockMethods + '\nmodule.exports = {'
);

const exportsAdd = `  getLoginSecurity,
  incrementFailedLogin,
  lockAccount,
  resetLoginSecurity,
  getPasswordHistory,
  addPasswordHistory,`;

content = content.replace(
  'module.exports = {',
  'module.exports = {\n' + exportsAdd
);

fs.writeFileSync(file, content);
