const { badRequest } = require('../../utils/AppError');

/**
 * Manual verification provider.
 *
 * The student pays out-of-band — GCash app, card terminal at the Cashier, an
 * online bank transfer, or cash — and submits proof. A Finance Clerk then
 * confirms it against the institution's own records. This is how every method
 * works today, and it is deliberate: PLP requires payments to reconcile against
 * Finance's books rather than a third party's dashboard.
 */
const manualProvider = {
  name: 'manual',

  /** Nothing to redirect to — the student pays elsewhere and comes back. */
  requiresRedirect: false,

  /**
   * What the UI needs to render the checkout step for this method.
   */
  describeCheckout(method, { amount }) {
    return {
      provider: 'manual',
      method_code: method.code,
      method_name: method.name,
      instructions: method.instructions,
      requires_reference: Boolean(method.requires_reference),
      reference_label: method.reference_label || 'Reference Number',
      requires_proof: Boolean(method.requires_proof),
      amount,
      // The GCash QR is the only method with an on-screen artefact to scan.
      show_qr: method.code === 'gcash',
    };
  },

  /**
   * Validate the student's submitted proof before it reaches the Finance queue.
   *
   * @throws {AppError} 400 when the method's requirements aren't met
   */
  validateSubmission(method, { reference, file }) {
    if (method.requires_reference && !String(reference || '').trim()) {
      throw badRequest(`${method.reference_label || 'Reference number'} is required.`);
    }
    if (method.requires_proof && !file) {
      throw badRequest('Please upload a photo or screenshot of your payment receipt.');
    }
    return { reference: String(reference || '').trim() };
  },
};

module.exports = manualProvider;
