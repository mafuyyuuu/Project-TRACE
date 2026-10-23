const env = require('./env');

/**
 * One CORS policy, shared by the REST API and the Socket.IO handshake so the
 * two can never disagree about who is allowed to call this server.
 *
 * Outside production, an unset `FRONTEND_URL` reflects the requesting origin. Locally
 * the Vite proxy makes requests same-origin anyway, and a teammate hitting the
 * API from their own machine shouldn't need a config change to do it.
 *
 * Once `FRONTEND_URL` is set — which a deployment must do — only those origins
 * are allowed. It accepts a comma-separated list so a staging domain and a
 * production domain can coexist.
 */
function allowedOrigins() {
  return env.FRONTEND_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * @returns {boolean|string[]} Production requires an explicit allowlist.
 */
function corsOrigin() {
  const origins = allowedOrigins();
  return origins.length > 0 ? origins : env.NODE_ENV !== 'production';
}

module.exports = { corsOrigin, allowedOrigins };
