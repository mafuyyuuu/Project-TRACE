const { randomUUID } = require('crypto');

/** API data includes student records and files; only static assets belong in a CDN cache. */
function apiSecurity(req, res, next) {
  res.locals.requestId = randomUUID();
  res.set('X-Request-Id', res.locals.requestId);
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
}

module.exports = apiSecurity;
