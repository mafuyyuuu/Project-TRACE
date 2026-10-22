/**
 * Global Express error handler. Must be registered last, after all routes.
 */
const { publicError, logError } = require('../utils/httpError');

function errorHandler(err, req, res, next) {
  logError('Unhandled error', err, res.locals?.requestId);
  if (res.headersSent) return next(err);

  // Handle Multer-specific errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  const result = publicError(err);
  if (err.type === 'entity.parse.failed') result.message = 'Request body must contain valid JSON.';
  if (err.type === 'entity.too.large') result.message = 'Request body is too large.';
  res.status(result.status).json({ error: result.message });
}

module.exports = errorHandler;
