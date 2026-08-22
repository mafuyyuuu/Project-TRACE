const path = require('path');

/**
 * Centralized access to environment-driven configuration for external
 * services. Keeping the fallbacks here means no module reaches into
 * `process.env` directly, and no real secret ever gets hardcoded as a
 * "default" value in source (see docs/CODING_PREFERENCES.md).
 */

// Loaded here (not only in app.js) so standalone scripts such as
// database/migration.js get the same configuration. Safe to call more than
// once — dotenv never overwrites variables that are already set.
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

/**
 * A secret with no safe default. Missing it is fatal: silently falling back to
 * a value committed in source would mean tokens are signed with a string
 * anyone can read from the repo.
 */
function requireSecret(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy backend/.env.example to backend/.env and set it.\n` +
      `Generate one with:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  return value;
}

// This exact string shipped as a hardcoded fallback and is present in git
// history, so any token signed with it is forgeable by anyone with repo access.
const COMPROMISED_JWT_SECRET = 'trace-jwt-secret-change-in-production';

const JWT_SECRET = requireSecret('JWT_SECRET');

// Shared secret for machine-to-machine callers (n8n router, payment webhooks).
// Required for the same reason as JWT_SECRET: a default would mean the
// endpoints it guards are effectively still open.
const WEBHOOK_SECRET = requireSecret('WEBHOOK_SECRET');

if (JWT_SECRET === COMPROMISED_JWT_SECRET) {
  console.warn(
    '\n⚠️  SECURITY: JWT_SECRET is still the placeholder value that is public in git history.\n' +
    '   Anyone with repo access can forge a token for any account, including admins.\n' +
    '   Replace it in backend/.env before deploying:\n' +
    '   node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n'
  );
}

module.exports = {
  JWT_SECRET,
  WEBHOOK_SECRET,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'trace_db',
  PORT: process.env.PORT || 3300,
  AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://127.0.0.1:5005',
  N8N_URL: process.env.N8N_URL || 'http://localhost:5678',
  UNISMS_SECRET_KEY: process.env.UNISMS_SECRET_KEY || '',
  UNISMS_SENDER_ID: process.env.UNISMS_SENDER_ID || 'TRACE',
  TEST_PHONE_NUMBER: process.env.TEST_PHONE_NUMBER || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || 'mock_user',
  SMTP_PASS: process.env.SMTP_PASS || 'mock_pass',
};
