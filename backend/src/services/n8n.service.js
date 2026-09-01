const env = require('../config/env');

/**
 * n8n orchestrator client.
 *
 * Institutional routing rules live in the n8n workflow, not in this codebase
 * (see docs/CODING_PREFERENCES.md) — Node.js only emits the event. Failures
 * are logged and swallowed so a stopped n8n container never blocks an upload.
 */
async function triggerDocumentRouting({
  document_id,
  tracking_number,
  document_type,
  student_id,
  course,
  college_code,
}) {
  try {
    await fetch(`${env.N8N_URL}/webhook/route-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `college_code` (CCS, CON, …) is what lets the workflow pick the right
      // college secretary. Without it n8n has no way to tell one secretary's
      // queue from another's, which is why it used to post a single hardcoded
      // clerk ID for every document.
      body: JSON.stringify({
        document_id,
        tracking_number,
        document_type,
        student_id,
        course,
        college_code,
      }),
    });
    console.log(`🔀 Triggered n8n routing for ${tracking_number}`);
  } catch (err) {
    console.warn('⚠️ n8n webhook unavailable:', err.message);
  }
}

module.exports = { triggerDocumentRouting };
