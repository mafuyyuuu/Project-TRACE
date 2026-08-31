/**
 * Document status presentation + per-document-type attachment rules.
 *
 * Mirrors `backend/src/utils/documentStatus.js`, exactly as `utils/pricing.js`
 * mirrors its backend counterpart — the two must be changed together. The
 * backend owns the transitions; this file owns only how a status is *shown*.
 *
 * Pipeline: evaluate first, pay later. See docs/SYSTEM_WORKFLOWS.md.
 */

/** Every status a document may hold. Mirrors the backend STATUS object. */
export const STATUS = {
  PENDING_W1_INTAKE: 'PENDING_W1_INTAKE',
  PENDING_SEC_EVALUATION: 'PENDING_SEC_EVALUATION',
  SEC_PROCESSING: 'SEC_PROCESSING',
  PENDING_STUDENT_PAYMENT: 'PENDING_STUDENT_PAYMENT',
  PENDING_FINANCE_VERIFICATION: 'PENDING_FINANCE_VERIFICATION',
  PAID_PENDING_SEC_RELEASE: 'PAID_PENDING_SEC_RELEASE',
  READY_FOR_RELEASE: 'READY_FOR_RELEASE',
  COMPLETED: 'COMPLETED',
};

/** The happy path, in order. */
export const PIPELINE = [
  STATUS.PENDING_W1_INTAKE,
  STATUS.PENDING_SEC_EVALUATION,
  STATUS.SEC_PROCESSING,
  STATUS.PENDING_STUDENT_PAYMENT,
  STATUS.PENDING_FINANCE_VERIFICATION,
  STATUS.PAID_PENDING_SEC_RELEASE,
  STATUS.READY_FOR_RELEASE,
  STATUS.COMPLETED,
];

/** Statuses reachable only from the pre-refactor pipeline. */
export const LEGACY_STATUS = { REJECTED: 'REJECTED', APPROVED: 'APPROVED' };

/** A document here is waiting on the student, not on a desk. */
export function isAwaitingStudent(status) {
  return status === STATUS.PENDING_STUDENT_PAYMENT;
}

/** A document here has been paid for and can no longer be cancelled. */
export function isPaid(status) {
  return [
    STATUS.PAID_PENDING_SEC_RELEASE,
    STATUS.READY_FOR_RELEASE,
    STATUS.COMPLETED,
  ].includes(status);
}

/**
 * Students may only cancel before the Secretary starts printing — past that
 * point paper and toner have already been spent on the request.
 */
export function isCancellable(status) {
  return [STATUS.PENDING_W1_INTAKE, STATUS.PENDING_SEC_EVALUATION].includes(status);
}

const PROGRESS = {
  [STATUS.PENDING_W1_INTAKE]: 10,
  [STATUS.PENDING_SEC_EVALUATION]: 25,
  [STATUS.SEC_PROCESSING]: 40,
  [STATUS.PENDING_STUDENT_PAYMENT]: 55,
  [STATUS.PENDING_FINANCE_VERIFICATION]: 70,
  [STATUS.PAID_PENDING_SEC_RELEASE]: 85,
  [STATUS.READY_FOR_RELEASE]: 95,
  [STATUS.COMPLETED]: 100,
};

/** Progress-bar percentage for a document's position in the pipeline. */
export function getProgressVal(status) {
  return PROGRESS[status] ?? 10;
}

/**
 * Student-facing label.
 *
 * Written from the student's point of view, not the office's: they care whether
 * the ball is in their court, so PENDING_STUDENT_PAYMENT reads as an
 * instruction rather than as a queue name.
 */
const STATUS_LABELS = {
  [STATUS.PENDING_W1_INTAKE]: 'Received — Awaiting Intake',
  [STATUS.PENDING_SEC_EVALUATION]: 'With the College Secretary',
  [STATUS.SEC_PROCESSING]: 'Being Processed',
  [STATUS.PENDING_STUDENT_PAYMENT]: 'Payment Required',
  [STATUS.PENDING_FINANCE_VERIFICATION]: 'Verifying Payment',
  [STATUS.PAID_PENDING_SEC_RELEASE]: 'Paid — Preparing for Release',
  [STATUS.READY_FOR_RELEASE]: 'Ready for Pick-up',
  [STATUS.COMPLETED]: 'Completed',
  [LEGACY_STATUS.REJECTED]: 'Rejected',
  [LEGACY_STATUS.APPROVED]: 'Approved',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

/** Desk name for a status — used where the office, not the student, is reading. */
const STAGE_LABELS = {
  [STATUS.PENDING_W1_INTAKE]: 'Window 1 Intake',
  [STATUS.PENDING_SEC_EVALUATION]: 'Secretary Evaluation',
  [STATUS.SEC_PROCESSING]: 'Secretary Processing',
  [STATUS.PENDING_STUDENT_PAYMENT]: 'Awaiting Student Payment',
  [STATUS.PENDING_FINANCE_VERIFICATION]: 'Finance Verification',
  [STATUS.PAID_PENDING_SEC_RELEASE]: 'Secretary Handoff',
  [STATUS.READY_FOR_RELEASE]: 'Window 1 Release',
  [STATUS.COMPLETED]: 'Completed',
};

export function getStageLabel(status) {
  return STAGE_LABELS[status] ?? status;
}

/**
 * These document types cannot be evaluated without supporting paperwork.
 *
 * Note this is no longer a *submission* gate. Since walk-in students file at the
 * counter with paper in hand, the requirement is satisfied at Window 1 intake —
 * either by the student's own upload or by the clerk's scan. The request form
 * uses this to prompt; the intake desk uses it to check.
 */
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
