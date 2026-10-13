const { rateLimit } = require('express-rate-limit');

/**
 * Throttles credential-guessing. Without this, every account is brute-forceable
 * at network speed — and all seeded accounts share one well-known password.
 *
 * Keyed by IP. Successful logins don't count toward the limit, so a legitimate
 * user working normally never trips it.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,                // 10 failed attempts per IP per window
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

/**
 * Registration is expensive: it writes a file to disk and runs an OCR pass on
 * the uploaded ID, so it is worth capping independently of login.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

/**
 * Password reset requests send an email to an address the requester does not
 * have to prove they control, so an unthrottled endpoint is a free relay for
 * mail-bombing any registered user. Keyed by IP, like the other limiters.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});

/** Broad backstop for the rest of the API. Generous enough not to affect normal use. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { loginLimiter, registerLimiter, passwordResetLimiter, apiLimiter };
