const { badRequest } = require('./AppError');

const PASSWORD_REQUIREMENTS = 'Password must be 8–64 characters and include uppercase, lowercase, number, and a special character (@$!%*?&_).';
function validNewPassword(value) {
  return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 64 &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/.test(value);
}
function validatePassword(value) {
  if (!validNewPassword(value)) throw badRequest(PASSWORD_REQUIREMENTS);
}

module.exports = { PASSWORD_REQUIREMENTS, validNewPassword, validatePassword };
