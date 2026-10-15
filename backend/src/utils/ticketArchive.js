const { badRequest } = require('./AppError');

/** Resolved is the archive state; never duplicate or delete conversation history. */
function ticketArchiveView(value) {
  if (value === undefined || value === null || value === '') return 'all';
  if (!['active','archive','all'].includes(value)) throw badRequest('Choose a valid ticket view.');
  return value;
}
module.exports = { ticketArchiveView };
