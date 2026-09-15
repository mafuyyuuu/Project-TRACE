/**
 * Error carrying an HTTP status code, so services can signal *what went wrong*
 * without importing `res`. Controllers translate these into responses; anything
 * that isn't an AppError is treated as an unexpected 500.
 */
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

const badRequest = (msg) => new AppError(msg, 400);
const unauthorized = (msg) => new AppError(msg, 401);
const forbidden = (msg) => new AppError(msg, 403);
const notFound = (msg) => new AppError(msg, 404);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound };
