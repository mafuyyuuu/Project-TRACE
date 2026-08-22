const env = require('../config/env');
const documentModel = require('../models/document.model');
const stepLogModel = require('../models/stepLog.model');

/**
 * Legacy automated payment-gateway hooks (PayMongo-style).
 *
 * NOTE: superseded by the manual GCash verification pipeline in
 * documents.service.js — the frontend does not call these endpoints. Kept
 * intact for the n8n/gateway integration path they were built for.
 */

async function handleWebhook(body) {
  const { data } = body;
  if (!data || !data.attributes) {
    return { ok: false, message: 'Invalid payload' };
  }

  const { tracking_number, status } = data.attributes;

  if (status === 'paid') {
    const [updateResult] = await documentModel.markPaidByTrackingNumber(tracking_number);

    if (updateResult.affectedRows > 0) {
      const docs = await documentModel.findByTrackingNumber(tracking_number);
      if (docs.length > 0) {
        await stepLogModel.insert({
          document_id: docs[0].id,
          clerk_id: null,
          action_taken: 'paid',
          from_status: 'pending_payment',
          to_status: 'submitted',
          notes: 'Payment successful via GCash/QRPh',
        });
      }
    }
  }

  return { ok: true, message: 'Webhook received' };
}

/** Test helper: fires this service's own webhook with a paid payload. */
async function simulatePayment({ tracking_number }) {
  await fetch(`http://localhost:${env.PORT}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { attributes: { tracking_number, status: 'paid' } } }),
  });

  return { message: 'Payment simulated successfully' };
}

module.exports = { handleWebhook, simulatePayment };
