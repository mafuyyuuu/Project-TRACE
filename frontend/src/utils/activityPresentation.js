const actions = {
  submitted: 'Request Submitted',
  walk_in_filed: 'Walk-in Request Filed',
  ai_verified: 'Artificial Intelligence (AI) Verified',
  ai_flagged: 'Flagged by Artificial Intelligence (AI)',
  routed: 'Request Routed',
  payment_submitted: 'Payment Submitted',
  payment_approved: 'Payment Approved',
  payment_rejected: 'Payment Rejected',
  intake_approved: 'Intake Approved',
  intake_returned: 'Intake Returned',
  secretary_accepted: 'Accepted by College Secretary',
  secretary_returned: 'Returned by College Secretary',
  priced: 'Document Priced',
  billed: 'Student Billed',
  or_verified: 'Official Receipt (OR) Verified',
  handed_to_window_1: 'Handed to Window 1',
  walk_in_payment_logged: 'Counter Payment Recorded',
  released: 'Document Released',
  official_receipt_published: 'Official Receipt (OR) Copy Published',
  attachment_request: 'Supporting Document Requested',
  attachment_upload: 'Supporting Document Uploaded',
  attachment_review: 'Supporting Document Reviewed',
  attachment_requested: 'Supporting Document Requested',
  attachment_uploaded: 'Supporting Document Uploaded',
  attachment_accepted: 'Supporting Document Accepted',
  attachment_rejected: 'Supporting Document Rejected',
  attachment_replaced: 'Supporting Document Replaced',
  profile_college_reconciled: 'Profile College Reconciled',
  staff_reassigned: 'Processing Staff Reassigned',
};
const abbreviations = {
  or: 'Official Receipt (OR)',
  ai: 'Artificial Intelligence (AI)',
  ocr: 'Optical Character Recognition (OCR)',
  tor: 'Transcript of Records (TOR)',
  ctc: 'Certified True Copy (CTC)',
  w1: 'Window 1',
};

/** Display saved audit codes without rewriting the underlying audit record. */
export function formatActivityAction(value) {
  const key = String(value || '').trim().replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();
  if (!key) return 'System Action';
  if (actions[key]) return actions[key];
  const words = key.split('_').filter(Boolean).map(word => abbreviations[word] || word).join(' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'System Action';
}
