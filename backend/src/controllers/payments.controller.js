const paymentsService = require('../services/payments.service');

/**
 * Thin HTTP layer for /api/payments (legacy gateway webhooks).
 * Webhooks must ack fast and never hang the caller — see
 * docs/CODING_PREFERENCES.md.
 */

async function webhook(req, res) {
  try {
    const result = await paymentsService.handleWebhook(req.body);
    if (!result.ok) {
      return res.status(400).send(result.message);
    }
    res.status(200).send(result.message);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
}

async function simulatePayment(req, res) {
  try {
    res.json(await paymentsService.simulatePayment(req.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { webhook, simulatePayment };
