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
 * Fee for one line item.
 *
 * `flat` fees come straight from `document_types.base_fee` and are fully
 * admin-editable. `per_semester_block` (Transcript of Records) charges the base
 * fee per block of four semesters, which isn't expressible as a single number
 * and so stays here in code.
 *
 * @param {{base_fee: number|string, fee_rule: string}} type document-type row
 * @param {number|string} semesters only meaningful for per_semester_block
 * @returns {number} fee for a single copy
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
 *
 * @param {string} documentType
 * @param {number|string} semesters only meaningful for TOR; defaults to 8
 * @param {number|string} copies defaults to 1
 * @param {{base_fee: number|string, fee_rule: string}} [type] row from the DB;
 *   omit to fall back to the historical hardcoded rates
 * @returns {{ amount: number, copies: number }}
 */
function calculateAmount(documentType, semesters, copies, type) {
  const copiesInt = parseInt(copies) || 1;
  const resolved = type || LEGACY_FEES[documentType] || DEFAULT_FEE;
  return { amount: feeForType(resolved, semesters) * copiesInt, copies: copiesInt };
}

/**
 * Total for a multi-document request, plus the per-item breakdown the caller
 * needs to write one `documents` row per item.
 *
 * @param {Array<{document_type: string, copies?: number|string, semesters?: number|string}>} items
 * @param {Array<{name: string, base_fee: number|string, fee_rule: string}>} types
 *   document-type rows loaded from the database
 * @returns {{ total: number, items: Array<{document_type, copies, semesters, amount}> }}
 */
function calculateGroupAmount(items, types = []) {
  const byName = new Map(types.map((t) => [t.name, t]));

  const priced = items.map((item) => {
    const copiesInt = parseInt(item.copies) || 1;
    const resolved = byName.get(item.document_type) || LEGACY_FEES[item.document_type] || DEFAULT_FEE;
    return {
      document_type: item.document_type,
      copies: copiesInt,
      semesters: parseInt(item.semesters) || null,
      amount: feeForType(resolved, item.semesters) * copiesInt,
    };
  });

  // Rounded to cents: repeated float addition can otherwise drift
  // (e.g. 0.1 + 0.2), and this figure is what the student is charged.
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
