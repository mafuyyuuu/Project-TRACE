const env = require('../config/env');

/**
 * n8n orchestrator client.
 *
 * Institutional routing rules live in the n8n workflow, not in this codebase
 * (see docs/CODING_PREFERENCES.md) — Node.js only emits the event. Failures
 * are logged and swallowed so a stopped n8n container never blocks an upload.
 */
async function triggerDocumentRouting({ document_id, tracking_number, document_type, student_id }) {
  try {
    await fetch(`${env.N8N_URL}/webhook/route-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id, tracking_number, document_type, student_id }),
    });
    console.log(`🔀 Triggered n8n routing for ${tracking_number}`);
  } catch (err) {
    console.warn('⚠️ n8n webhook unavailable:', err.message);
  }
}

module.exports = { triggerDocumentRouting };
