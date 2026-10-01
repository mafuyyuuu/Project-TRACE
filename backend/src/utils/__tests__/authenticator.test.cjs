const env = require('../../config/env');
const otp = require('../authenticator');
beforeEach(() => vi.spyOn(env, 'MFA_ENCRYPTION_KEY', 'get').mockReturnValue('a'.repeat(64)));

it.each([
  [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
  [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
])('matches RFC 6238 SHA-1 vector at %s seconds', (seconds, expected) => {
  const secret = otp.base32(Buffer.from('12345678901234567890'));
  expect(otp.totp(secret, Math.floor(seconds / 30), 8)).toBe(expected);
});
it('accepts bounded clock drift and rejects replay and malformed input', () => {
  const secret = otp.newSecret(); const now = 900000;
  const code = otp.totp(secret, 30);
  expect(otp.verifyCode(secret, code, -1, now)).toBe(30);
  expect(otp.verifyCode(secret, code, 30, now)).toBeNull();
  expect(otp.verifyCode(secret, otp.totp(secret, 28), -1, now)).toBeNull();
  expect(otp.verifyCode(secret, '123', -1, now)).toBeNull();
  expect(otp.verifyCode(secret, 123456, -1, now)).toBeNull();
});
it('encrypts with random nonces, authenticates the account and rejects tampering', () => {
  const secret = otp.newSecret(); const encrypted = otp.encrypt(secret, 3);
  expect(encrypted).not.toContain(secret);
  expect(otp.encrypt(secret, 3)).not.toBe(encrypted);
  expect(otp.decrypt(encrypted, 3)).toBe(secret);
  expect(() => otp.decrypt(encrypted, 4)).toThrow('unavailable');
  expect(() => otp.decrypt(`${encrypted.slice(0, -2)}ff`, 3)).toThrow('unavailable');
});
it('fails closed without a valid separate encryption key', () => {
  vi.spyOn(env, 'MFA_ENCRYPTION_KEY', 'get').mockReturnValue('');
  expect(otp.configured()).toBe(false);
  expect(() => otp.encrypt('SECRET', 3)).toThrow('configure MFA');
});
it('generates high-entropy recovery codes and hashes only valid normalized codes', () => {
  const codes = otp.recoveryCodes();
  expect(new Set(codes).size).toBe(10);
  expect(otp.recoveryHash(codes[0])).toMatch(/^[a-f0-9]{64}$/);
  expect(otp.recoveryHash(codes[0].toLowerCase())).toBe(otp.recoveryHash(codes[0]));
  expect(otp.recoveryHash('123456')).toBeNull();
  expect(otp.recoveryHash(undefined)).toBeNull();
});
