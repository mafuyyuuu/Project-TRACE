const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { createHmac } = require('crypto');
const env = require('../config/env');
const { MysqlRateLimitStore } = require('../services/rateLimitStore.service');
if (!['mysql', 'memory'].includes(env.RATE_LIMIT_STORE)) throw new Error('RATE_LIMIT_STORE must be mysql or memory.');
function verifiedAccount(req, pending = false) {
  if (req.user?.id) return `account:${req.user.id}`;
  const token = pending ? req.body?.temp_token : req.headers.authorization?.replace(/^Bearer /, '');
  try {
    const data = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (Number.isSafeInteger(data.id) && data.exp && (pending ? data.pending_2fa === true : !data.pending_2fa)) return `account:${data.id}`;
  } catch { /* Untrusted claims never select an account bucket. */ }
  return null;
}
function networkKey(req) { return `ip:${ipKeyGenerator(req.ip)}`; }
function accountKey(req) { return verifiedAccount(req) || networkKey(req); }
function loginKey(req) {
  const account = verifiedAccount(req) || verifiedAccount(req, true);
  if (account) return account;
  const id = req.body?.student_id;
  return typeof id === 'string' && id.trim().length <= 150
    ? `login:${createHmac('sha256', env.JWT_SECRET).update(id.trim().toUpperCase()).digest('hex')}` : networkKey(req);
}
function limiter(namespace, limit, windowMs = 900000, extra = {}) {
  return rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    ...(env.RATE_LIMIT_STORE === 'mysql' ? { store: new MysqlRateLimitStore(namespace) } : {}), ...extra });
}
const loginLimiter = limiter('login', 10, 900000, { keyGenerator: loginKey, skipSuccessfulRequests: true });
const loginNetworkLimiter = limiter('login-network', 200, 900000, { skipSuccessfulRequests: true });
const registerLimiter = limiter('register', 20, 3600000);
const passwordResetLimiter = limiter('password-reset', 10, 3600000);
const apiLimiter = limiter('api', 1000, 900000, { keyGenerator: accountKey });
const registrationIdLimiter = limiter('registration-id', 30);
const uploadLimiter = limiter('upload', 40, 900000, { keyGenerator: accountKey });
const ocrLimiter = limiter('ocr', 20, 900000, { keyGenerator: accountKey });
const exportLimiter = limiter('export', 10, 900000, { keyGenerator: accountKey });
const faqFeedbackLimiter=limiter('faq-feedback',120,900000,{keyGenerator:accountKey});
module.exports = { faqFeedbackLimiter, loginLimiter, loginNetworkLimiter, registerLimiter, passwordResetLimiter, apiLimiter, registrationIdLimiter, uploadLimiter, ocrLimiter, exportLimiter, verifiedAccount, loginKey };
