const { badRequest } = require('./AppError');
const PHONE_REQUIREMENTS = 'Enter a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.';

function normalizePhoneNumber(value) {
  if (typeof value !== 'string' || value.length > 13) return null;
  if (/^09\d{9}$/.test(value)) return value;
  if (/^\+639\d{9}$/.test(value)) return `0${value.slice(3)}`;
  return null;
}

function validatePhoneNumber(value, { required = true } = {}) {
  if (!required && value === '') return '';
  const normalized = normalizePhoneNumber(value);
  if (!normalized) throw badRequest(PHONE_REQUIREMENTS);
  return normalized;
}

module.exports = { PHONE_REQUIREMENTS, normalizePhoneNumber, validatePhoneNumber };
