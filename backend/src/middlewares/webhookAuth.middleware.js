const crypto = require('crypto');
const env = require('../config/env');

/**
 * Guards machine-to-machine endpoints that have no user session — the n8n
 * router calling /documents/assign, and payment-gateway webhooks.
 *
 * These used to be completely open: anyone who could reach the API could
 * reassign documents or post a fake "paid" webhook. Callers must now present
 * the shared secret in the `x-webhook-secret` header.
 */
function verifyWebhookSecret(req, res, next) {
  const provided = req.get('x-webhook-secret') || '';
  const expected = env.WEBHOOK_SECRET;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  // Compare in constant time; length must match first since timingSafeEqual
  // throws on differing lengths.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn(`⚠️  Rejected unauthenticated webhook call to ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Invalid or missing webhook secret.' });
  }

  next();
}

module.exports = { verifyWebhookSecret };
