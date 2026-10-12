const { PIPELINE, isTerminal } = require('./documentStatus');
const { badRequest } = require('./AppError');

function isCaseReadOnly(status) {
  return !PIPELINE.includes(status) || isTerminal(status);
}
function assertCaseWritable(status) {
  if (isCaseReadOnly(status)) throw badRequest('This document case is closed or needs Registrar review. Its conversation and files are read-only.');
}
module.exports = { isCaseReadOnly, assertCaseWritable };
