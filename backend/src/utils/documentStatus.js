/**
 * The document pipeline's single source of truth: the status values, the legal
 * moves between them, and the desk labels reports render.
 *
 * Kept free of database and service imports so the state machine can be
 * reasoned about (and tested) on its own. This file is mirrored by
 * `frontend/src/utils/documentStatus.js`, exactly as `utils/pricing.js` is —
 * the two must be changed together.
 *
 * The pipeline is "evaluate first, pay later": the College Secretary processes
 * and prints a document before anyone knows its price, because the price comes
 * from the page count. See docs/SYSTEM_WORKFLOWS.md.
 */

/**
 * Every status a document may hold.
 *
 * `current_status` is a VARCHAR, not a database ENUM — migration.js deliberately
 * widened it years ago so a pipeline change wouldn't need an ALTER. That makes
 * *this* object the only thing enforcing the vocabulary, which is why nothing
 * outside it may write a bare status string.
 */
const STATUS = {
  /** Filed online by a student, or typed in by Window 1 for a walk-in. */
  PENDING_W1_INTAKE: 'PENDING_W1_INTAKE',
  /** Window 1 has checked the paperwork; waiting on the College Secretary. */
  PENDING_SEC_EVALUATION: 'PENDING_SEC_EVALUATION',
  /** Secretary accepted it, gave the student an ETA, and is printing it. */
  SEC_PROCESSING: 'SEC_PROCESSING',
  /** Printed and priced. The student now owes money and has been told so. */
  PENDING_STUDENT_PAYMENT: 'PENDING_STUDENT_PAYMENT',
  /** Payment claimed — digitally by the student, or logged by Finance for a walk-in. */
  PENDING_FINANCE_VERIFICATION: 'PENDING_FINANCE_VERIFICATION',
  /** Finance confirmed the money. The Secretary still holds the physical copy. */
  PAID_PENDING_SEC_RELEASE: 'PAID_PENDING_SEC_RELEASE',
  /**
   * The Secretary has checked the Official Receipt paperwork Finance attached —
   * present, and the number looks right. Still holds the physical copy.
   *
   * A procedural completeness check, not a second money decision: it never
   * touches `payment_status`. Only Finance ever sets PAID (verifyPayment) —
   * this step exists so the Secretary doesn't hand a document to Window 1 on
   * the strength of a payment nobody has actually looked the paperwork for.
   */
  SEC_OR_VERIFIED: 'SEC_OR_VERIFIED',
  /** Physically at Window 1, waiting for the student to collect it. */
  READY_FOR_RELEASE: 'READY_FOR_RELEASE',
  /** Handed over. Terminal. */
  COMPLETED: 'COMPLETED',
};

/**
 * Statuses that only ever arrive from the pre-2026-08 pipeline.
 *
 * The old `processAction` endpoint wrote these outside the pipeline entirely.
 * They are preserved rather than remapped: rewriting them into a modern status
 * would claim those documents passed through desks they never saw.
 */
const LEGACY_STATUS = {
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
};

/** The happy path, in order. Drives progress bars and report stage ordering. */
const PIPELINE = [
  STATUS.PENDING_W1_INTAKE,
  STATUS.PENDING_SEC_EVALUATION,
  STATUS.SEC_PROCESSING,
  STATUS.PENDING_STUDENT_PAYMENT,
  STATUS.PENDING_FINANCE_VERIFICATION,
  STATUS.PAID_PENDING_SEC_RELEASE,
  STATUS.SEC_OR_VERIFIED,
  STATUS.READY_FOR_RELEASE,
  STATUS.COMPLETED,
];

/**
 * Legal moves, as `{ from: [to, …] }`.
 *
 * Forward edges are the desk actions. Backward edges are rejections, and every
 * one goes back exactly one step so a document is always returned to the desk
 * that can actually fix it.
 *
 * Two deliberate gaps:
 *  - `PENDING_W1_INTAKE` has no backward edge. It is the first state, so a
 *    Window 1 clerk returning a request to the student logs the reason and
 *    leaves the status alone — there is nowhere further back to send it.
 *  - `PAID_PENDING_SEC_RELEASE` has no backward edge. Money has changed hands;
 *    reversing past that point is a refund, which is an accounting decision the
 *    registrar makes off-system, not a state transition.
 */
const TRANSITIONS = {
  [STATUS.PENDING_W1_INTAKE]: [STATUS.PENDING_SEC_EVALUATION],
  [STATUS.PENDING_SEC_EVALUATION]: [STATUS.SEC_PROCESSING, STATUS.PENDING_W1_INTAKE],
  [STATUS.SEC_PROCESSING]: [STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_SEC_EVALUATION],
  [STATUS.PENDING_STUDENT_PAYMENT]: [STATUS.PENDING_FINANCE_VERIFICATION, STATUS.SEC_PROCESSING],
  [STATUS.PENDING_FINANCE_VERIFICATION]: [STATUS.PAID_PENDING_SEC_RELEASE, STATUS.PENDING_STUDENT_PAYMENT],
  [STATUS.PAID_PENDING_SEC_RELEASE]: [STATUS.SEC_OR_VERIFIED],
  [STATUS.SEC_OR_VERIFIED]: [STATUS.READY_FOR_RELEASE],
  [STATUS.READY_FOR_RELEASE]: [STATUS.COMPLETED, STATUS.SEC_OR_VERIFIED],
  [STATUS.COMPLETED]: [],
  [LEGACY_STATUS.REJECTED]: [],
  [LEGACY_STATUS.APPROVED]: [],
};

/**
 * Old pipeline → new, used by the migration for both `documents.current_status`
 * and the `step_logs` history.
 *
 * `pending_secretary` maps *forward*, not back: under the old
 * pay-first pipeline a document only reached the Secretary after Finance had
 * already marked it PAID, so its modern equivalent is the post-payment
 * handoff — not the pre-payment evaluation queue that shares its name.
 */
const LEGACY_STATUS_MAP = {
  pending_payment: STATUS.PENDING_W1_INTAKE,
  pending_payment_verification: STATUS.PENDING_FINANCE_VERIFICATION,
  pending_secretary: STATUS.PAID_PENDING_SEC_RELEASE,
  ready_window_1: STATUS.READY_FOR_RELEASE,
  completed: STATUS.COMPLETED,
  released: STATUS.COMPLETED,
  rejected: LEGACY_STATUS.REJECTED,
  approved: LEGACY_STATUS.APPROVED,
};

/** Desk names for the raw status values, for reports and activity logs. */
const STAGE_LABELS = {
  [STATUS.PENDING_W1_INTAKE]: 'Window 1 Intake',
  [STATUS.PENDING_SEC_EVALUATION]: 'Secretary Evaluation',
  [STATUS.SEC_PROCESSING]: 'Secretary Processing',
  [STATUS.PENDING_STUDENT_PAYMENT]: 'Awaiting Student Payment',
  [STATUS.PENDING_FINANCE_VERIFICATION]: 'Finance Verification',
  [STATUS.PAID_PENDING_SEC_RELEASE]: 'Secretary Handoff',
  [STATUS.SEC_OR_VERIFIED]: 'OR Verification',
  [STATUS.READY_FOR_RELEASE]: 'Window 1 Release',
  [STATUS.COMPLETED]: 'Completed',
  [LEGACY_STATUS.REJECTED]: 'Rejected (legacy)',
  [LEGACY_STATUS.APPROVED]: 'Approved (legacy)',
  // Not pipeline statuses. `ai-engine/mock_data_gen.py` seeds ~30,000 step_logs
  // rows carrying these as stage markers so Prophet has volume history to train
  // on. They are left as-is by the migration for the same reason the legacy
  // terminals are — they record what the generator did, not a desk a document
  // passed through — but reports still read them, so they still need a label.
  submitted: 'Intake',
  processing: 'Processing',
};

/** True once a document can no longer move. */
function isTerminal(status) {
  return (TRANSITIONS[status] || []).length === 0;
}

/** Whether `to` is reachable from `from` in one move. */
function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Guard every desk action with this before writing a new status.
 *
 * Throwing here rather than at the model layer means an illegal move is a 400
 * the clerk can understand, not a silent UPDATE that corrupts the audit trail —
 * `step_logs` is append-only, so a bad transition can never be tidied away.
 *
 * @param {string} from the document's current status
 * @param {string} to the status the desk action wants to set
 * @throws {AppError} 400 when the move isn't legal
 */
function assertTransition(from, to) {
  if (canTransition(from, to)) return;

  const { badRequest } = require('./AppError');
  const label = STAGE_LABELS[from] || from;
  throw badRequest(
    isTerminal(from)
      ? `This request is already at "${label}" and cannot be changed.`
      : `A document at "${label}" cannot move to "${STAGE_LABELS[to] || to}".`
  );
}

module.exports = {
  STATUS,
  LEGACY_STATUS,
  PIPELINE,
  TRANSITIONS,
  LEGACY_STATUS_MAP,
  STAGE_LABELS,
  isTerminal,
  canTransition,
  assertTransition,
};
