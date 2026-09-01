/**
 * Global Express error handler. Must be registered last, after all routes.
 */
function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);

  // Handle Multer-specific errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
}

module.exports = errorHandler;
