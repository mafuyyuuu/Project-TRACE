const manualProvider = require('./manual.provider');
const { badRequest } = require('../../utils/AppError');

/**
 * Payment provider registry.
 *
 * Every method currently resolves to the manual provider, because PLP settles
 * payments against Finance's own records rather than a third party. The
 * indirection exists so a hosted gateway can be added later without touching
 * `documents.service.js`: register it here and set `payment_methods.provider`
 * to its name.
 *
 * A gateway provider would implement the same shape:
 *   - `requiresRedirect: true`
 *   - `describeCheckout(method, { amount, document })` returning a checkout URL
 *   - `validateSubmission(...)` (or a webhook confirming payment instead)
 */
const PROVIDERS = {
  manual: manualProvider,
};

/**
 * @param {{provider: string, code: string}} method row from `payment_methods`
 */
function getProvider(method) {
  const provider = PROVIDERS[method?.provider || 'manual'];
  if (!provider) {
    // Configuration error rather than user error, but surfacing it as a 400
    // with the method name is more useful than a generic 500.
    throw badRequest(`Payment method "${method.code}" is not available right now.`);
  }
  return provider;
}

module.exports = { getProvider, PROVIDERS };
