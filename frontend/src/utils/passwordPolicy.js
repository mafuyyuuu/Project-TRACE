export const PASSWORD_REQUIREMENTS = 'Use at least 8 and no more than 64 characters, with uppercase, lowercase, a number and a special character (@$!%*?&).';
export function validNewPassword(value) {
  return typeof value === 'string' && value.length <= 64 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
}
