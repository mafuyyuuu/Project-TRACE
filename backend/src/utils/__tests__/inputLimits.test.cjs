const { INPUT_LIMITS, PROFILE_TEXT_LIMITS, validateTextFields } = require('../inputLimits');
const { validatePhoneNumber, normalizePhoneNumber } = require('../phoneNumber');

it.each(Object.entries(PROFILE_TEXT_LIMITS))('enforces %s at its exact length boundary', (field, limit) => {
  expect(() => validateTextFields({ [field]: 'x'.repeat(limit) }, PROFILE_TEXT_LIMITS)).not.toThrow();
  expect(() => validateTextFields({ [field]: 'x'.repeat(limit + 1) }, PROFILE_TEXT_LIMITS)).toThrow('at most');
  expect(() => validateTextFields({ [field]: [] }, PROFILE_TEXT_LIMITS)).toThrow('must be text');
});

it('preserves local digits and normalizes the complete international Philippine prefix', () => {
  expect(validatePhoneNumber('09123456789')).toBe('09123456789');
  expect(validatePhoneNumber('+639123456789')).toBe('09123456789');
  expect(INPUT_LIMITS.phone).toBe(13);
  expect(validatePhoneNumber('', { required: false })).toBe('');
});

it.each(['', '09123', '091234567890', '+6391234567890', '639123456789', '+12025550123',
  '0912345678a', '0912 345 6789', '9'.repeat(500), 9123456789, {}, null])('rejects malformed or oversized phone values (%j)', value => {
  expect(normalizePhoneNumber(value)).toBeNull();
  expect(() => validatePhoneNumber(value)).toThrow('Philippine mobile');
});
