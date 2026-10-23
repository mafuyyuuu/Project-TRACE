/** Read-only live acceptance. Prints boolean results, never secrets or records. */
const env = require('../src/config/env');
const { pool } = require('../src/config/db');
async function check() {
  const results = { production: env.NODE_ENV === 'production', non_root_process: process.getuid?.() !== 0,
    non_root_database: env.DB_USER !== 'root', explicit_origins: Boolean(env.FRONTEND_URL),
    shared_rate_limits: env.RATE_LIMIT_STORE === 'mysql', strong_gateway_key: env.AI_ENGINE_SECRET.length >= 32,
    independent_gateway_key: env.AI_ENGINE_SECRET !== env.JWT_SECRET && env.AI_ENGINE_SECRET !== env.WEBHOOK_SECRET,
    mfa_key_configured: /^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY), writable_uploads: false, restricted_db_grants: false };
  try { require('fs').accessSync(require('../src/middlewares/upload.middleware').UPLOAD_DIR, require('fs').constants.W_OK); results.writable_uploads = true; } catch {}
  await pool.query('SELECT bucket_key FROM rate_limit_counters LIMIT 0');
  const [grants] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
  results.restricted_db_grants = !grants.some(row => Object.values(row).some(value => /ALL PRIVILEGES|GRANT OPTION|CREATE|ALTER|DROP|SUPER|FILE|PROCESS|RELOAD|SHUTDOWN|EXECUTE/i.test(value)));
  console.log(JSON.stringify(results, null, 2));
  if (Object.values(results).some(value => !value)) process.exitCode = 1;
}
if (require.main === module) check().catch(() => { console.error('Security preflight could not finish. Check connectivity/schema privately.'); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { check };
