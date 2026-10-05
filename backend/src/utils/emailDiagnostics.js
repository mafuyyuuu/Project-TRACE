// Provider text can contain recipients, credentials or message content. Keep
// operational logs/results restricted to known codes and numeric metadata.
const codes = new Set(['EAUTH', 'EDNS', 'ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'ETLS', 'EENVELOPE', 'EMESSAGE',
  'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR',
  'ER_ACCESS_DENIED_ERROR', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT', 'PROTOCOL_CONNECTION_LOST']);
const commands = new Set(['CONN', 'EHLO', 'HELO', 'STARTTLS', 'AUTH', 'AUTH PLAIN', 'AUTH LOGIN', 'AUTH XOAUTH2', 'MAIL FROM', 'RCPT TO', 'DATA', 'QUIT']);

function errorDetails(error) {
  const result = { code: codes.has(error?.code) ? error.code : 'UNKNOWN' };
  if (commands.has(error?.command)) result.command = error.command;
  if (Number.isInteger(error?.responseCode) && error.responseCode >= 100 && error.responseCode <= 599) result.response_code = error.responseCode;
  return result;
}

function logEmailOutcome(result, { requestId, purpose } = {}) {
  const record = { purpose: purpose === 'password_reset' ? purpose : 'notification', outcome: result.outcome, ...result.diagnostics };
  if (typeof requestId === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId)) record.request_id = requestId;
  const log = result.ok ? console.log : console.warn;
  log('[Email]', JSON.stringify(record));
  return result;
}

module.exports = { errorDetails, logEmailOutcome };
