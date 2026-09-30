const crypto = require('crypto');

/**
 * Pure request-pricing and identifier helpers.
 *
 * Kept free of database and service imports so they can be reasoned about (and
 * tested) in isolation — this is the fee logic the registrar actually charges.
 * Callers pass the document-type rows in; this file never queries.
 */

/** Unique, human-quotable tracking number, e.g. "TRC-9F2A41B7". */
function generateTrackingNumber() {
  return 'TRC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/** A multi-document request groups its documents under one of these. */
function generateRequestGroupId() {
  return 'REQ-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

/** Fallback fees, used only when a document type is missing from the database. */
const LEGACY_FEES = {
  'Transcript of Records': { base_fee: 100.0, fee_rule: 'per_semester_block' },
  'Transcript of Records (TOR)': { base_fee: 100.0, fee_rule: 'per_semester_block' },
  'Honorable Dismissal': { base_fee: 100.0, fee_rule: 'flat' },
};
const DEFAULT_FEE = { base_fee: 50.0, fee_rule: 'flat' };

/**
 * Fee for one line item (Estimate).
 *
 * @param {{base_fee: number|string, fee_rule: string}} type document-type row
 * @param {number|string} semesters only meaningful for per_semester_block
 * @returns {number} estimated fee for the document
 */
function feeForType(type, semesters) {
  const baseFee = parseFloat(type.base_fee);
  if (type.fee_rule === 'per_semester_block') {
    const semestersInt = parseInt(semesters) || 8;
    return Math.ceil(semestersInt / 4) * baseFee;
  }
  return baseFee;
}

/**
 * Single-item pricing, kept for the legacy one-document-per-request path.
 * Requested copies multiply the per-copy estimate; the Secretary sets the final price.
 */
function calculateAmount(documentType, semesters, copies, type) {
  const resolved = type || LEGACY_FEES[documentType] || DEFAULT_FEE;
  const quantity = positiveCopies(copies);
  return { amount: feeForType(resolved, semesters) * quantity, copies: quantity };
}

function positiveCopies(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}

/**
 * Total for a multi-document request.
 */
function calculateGroupAmount(items, types = []) {
  const byName = new Map(types.map((t) => [t.name, t]));

  const priced = items.map((item) => {
    const resolved = byName.get(item.document_type) || LEGACY_FEES[item.document_type] || DEFAULT_FEE;
    return {
      document_type: item.document_type,
      copies: positiveCopies(item.copies),
      semesters: parseInt(item.semesters) || null,
      amount: feeForType(resolved, item.semesters) * positiveCopies(item.copies),
    };
  });

  const total = Math.round(priced.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;

  return { total, items: priced };
}

module.exports = {
  generateTrackingNumber,
  generateRequestGroupId,
  calculateAmount,
  calculateGroupAmount,
  feeForType,
};
