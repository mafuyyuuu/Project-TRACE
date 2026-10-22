const { randomUUID } = require('crypto');
const env = require('../config/env');
const context = require('../utils/requestContext');
const operations = require('../services/operations.service');
function apiSecurity(req, res, next) {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.set('X-Request-Id', requestId);
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  const end = operations.begin(), start = performance.now();
  let ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    const aborted = !res.writableFinished;
    const ms = Math.round(performance.now() - start);
    end(aborted ? 499 : res.statusCode, ms);
    if (env.HTTP_ACCESS_LOG) console.info(JSON.stringify({ event: 'http_request', request_id: requestId,
      method: req.method, route: req.route?.path || 'unmatched', status: aborted ? 499 : res.statusCode,
      duration_ms: ms, aborted }));
  };
  res.once('finish', finish); res.once('close', finish);
  context.run({ requestId }, next);
}
module.exports = apiSecurity;
