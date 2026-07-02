const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * POST /webhook
 * Simulates a webhook from a payment gateway (e.g. PayMongo)
 */
router.post('/webhook', async (req, res) => {
  try {
    const { data } = req.body;
    // Mock webhook payload: { data: { attributes: { tracking_number: 'TRC-1234', status: 'paid' } } }
    if (!data || !data.attributes) {
      return res.status(400).send('Invalid payload');
    }

    const { tracking_number, status } = data.attributes;

    if (status === 'paid') {
      const [updateResult] = await pool.query(
        'UPDATE documents SET payment_status = "PAID", current_status = "submitted" WHERE tracking_number = ? AND payment_status = "UNPAID"',
        [tracking_number]
      );

      if (updateResult.affectedRows > 0) {
        // Find document id
        const [doc] = await pool.query('SELECT id FROM documents WHERE tracking_number = ?', [tracking_number]);
        if (doc.length > 0) {
          await pool.query(
            `INSERT INTO step_logs (document_id, action_taken, from_status, to_status, notes)
             VALUES (?, 'paid', 'pending_payment', 'submitted', 'Payment successful via GCash/QRPh')`,
            [doc[0].id]
          );
        }
      }
    }
    
    res.status(200).send('Webhook received');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * POST /simulate-payment
 * Helper for testing without real PayMongo integration
 */
router.post('/simulate-payment', async (req, res) => {
  try {
    const { tracking_number } = req.body;
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    
    // Call our own webhook
    await fetchFn(`http://localhost:${process.env.PORT || 3000}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          attributes: {
            tracking_number,
            status: 'paid'
          }
        }
      })
    });
    
    res.json({ message: 'Payment simulated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
