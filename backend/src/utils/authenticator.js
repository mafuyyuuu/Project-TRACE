const crypto = require('crypto');
const env = require('../config/env');
const { AppError } = require('./AppError');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encryptionKey() {
  if (!/^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY)) {
    throw new AppError('Authenticator setup is unavailable. Ask the administrator to configure MFA encryption.', 503);
  }
  return Buffer.from(env.MFA_ENCRYPTION_KEY, 'hex');
}
function configured() {
  return /^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY);
}
function base32(bytes) {
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; output += alphabet[(value >>> bits) & 31]; }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
function fromBase32(value) {
  if (!/^[A-Z2-7]+$/.test(value)) throw new Error('Invalid authenticator key');
  let bits = 0, buffer = 0;
  const bytes = [];
  for (const char of value) {
    buffer = (buffer << 5) | alphabet.indexOf(char); bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >>> bits) & 255); }
  }
  return Buffer.from(bytes);
}
const newSecret = () => base32(crypto.randomBytes(20));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalizeRecovery = value => typeof value === 'string' ? value.trim().toUpperCase().replace(/-/g, '') : '';
function recoveryHash(value) {
  const normalized = normalizeRecovery(value);
  return /^[A-F0-9]{32}$/.test(normalized) ? hash(normalized) : null;
}
function recoveryCodes() {
  return Array.from({ length: 10 }, () => crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g).join('-'));
}
function encrypt(secret, userId) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`TRACE:MFA:${userId}`));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}
function decrypt(value, userId) {
  const key = encryptionKey();
  try {
    const [iv, tag, data] = value.split(':').map(part => Buffer.from(part, 'hex'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(`TRACE:MFA:${userId}`)); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('Authenticator verification is unavailable. Contact the administrator.', 503);
  }
}
function totp(secret, counter, digits = 6, algorithm = 'sha1') {
  const moving = Buffer.alloc(8); moving.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac(algorithm, fromBase32(secret)).update(moving).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).padStart(digits, '0');
}
function verifyCode(secret, code, lastCounter = -1, now = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30000);
  for (const counter of [current, current - 1, current + 1]) {
    if (counter < 0 || counter <= Number(lastCounter ?? -1)) continue;
    if (crypto.timingSafeEqual(Buffer.from(totp(secret, counter)), Buffer.from(code))) return counter;
  }
  return null;
}
function provisioningUri(secret, identifier) {
  return `otpauth://totp/${encodeURIComponent(`TRACE:${identifier}`)}?secret=${secret}&issuer=TRACE&algorithm=SHA1&digits=6&period=30`;
}
module.exports = { configured, base32, newSecret, hash, recoveryHash, recoveryCodes, encrypt, decrypt, totp, verifyCode, provisioningUri };
