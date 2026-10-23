function statusOf(error) {
  const status = error?.status ?? error?.statusCode;
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

/** Expected client errors stay useful; internal messages never become API responses. */
function publicError(error, fallback = 'Internal server error.') {
  const status = statusOf(error);
  const message = status < 500 && typeof error?.message === 'string' ? error.message : fallback;
  return { status, message };
}

/** SQL errors may contain student values. Do not serialize errors, request bodies or tokens. */
function logError(event, error, requestId = require('./requestContext').getStore()?.requestId) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(error.code)
    ? error.code : 'INTERNAL_ERROR';
  console.error(JSON.stringify({ event, status: statusOf(error), code, request_id: requestId }));
}

function sendError(res, error, fallback) {
  const result = publicError(error, fallback);
  if (result.status >= 500) logError('API operation failed', error, res.locals?.requestId);
  return res.status(result.status).json({ error: result.message });
}
module.exports = { publicError, logError, sendError };
