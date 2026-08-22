/**
 * Document status presentation + per-document-type attachment rules.
 * Mirrors the backend pipeline in docs/SYSTEM_WORKFLOWS.md.
 */

/** Progress-bar percentage for a document's position in the pipeline. */
export function getProgressVal(status) {
  switch (status) {
    case 'pending_payment': return 20;
    case 'pending_payment_verification': return 40;
    case 'pending_secretary': return 65;
    case 'ready_window_1': return 90;
    case 'completed':
    case 'released': return 100;
    default: return 10;
  }
}

/** Student-facing label for a raw status value. */
export function getStatusLabel(status) {
  switch (status) {
    case 'pending_payment': return 'Awaiting Payment';
    case 'pending_payment_verification': return 'Verifying Payment';
    case 'pending_secretary': return 'Secretary Evaluation';
    case 'ready_window_1': return 'Ready for Release';
    case 'completed': return 'Completed';
    case 'released': return 'Completed';
    default: return status;
  }
}

/** These document types cannot be submitted without a supporting upload. */
export function requiresAttachment(type) {
  return ['Honorable Dismissal', 'Graduation Clearance', 'Certificate of Good Moral'].includes(type);
}

export function getAttachmentLabel(type) {
  if (type === 'Honorable Dismissal') return 'Required Attachment (Validated Clearance)';
  if (type === 'Graduation Clearance') return 'Required Attachment (Signed Routing Form)';
  if (type === 'Certificate of Good Moral') return 'Required Attachment (Valid Student ID)';
  return 'Optional Attachment (Clearances, Old ID, etc)';
}

export function getAttachmentHelper(type) {
  if (type === 'Honorable Dismissal') return 'clearance file';
  if (type === 'Graduation Clearance') return 'signed clearance form';
  if (type === 'Certificate of Good Moral') return 'student ID photo';
  return 'optional files';
}
