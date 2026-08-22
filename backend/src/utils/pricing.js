const crypto = require('crypto');

/**
 * Pure request-pricing and identifier helpers.
 *
 * Kept free of database and service imports so they can be reasoned about (and
 * tested) in isolation — this is the fee logic the registrar actually charges.
 */

/** Unique, human-quotable tracking number, e.g. "TRC-9F2A41B7". */
function generateTrackingNumber() {
  return 'TRC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Request pricing.
 *
 * Transcript of Records is charged per block of 4 semesters (₱100 per block);
 * Honorable Dismissal is a flat ₱100; everything else is ₱50. The result is
 * multiplied by the number of copies.
 *
 * @param {string} documentType
 * @param {number|string} semesters only meaningful for TOR; defaults to 8
 * @param {number|string} copies defaults to 1
 * @returns {{ amount: number, copies: number }}
 */
function calculateAmount(documentType, semesters, copies) {
  const copiesInt = parseInt(copies) || 1;
  const semestersInt = parseInt(semesters) || 8;

  let baseAmount = 50.0;
  if (documentType === 'Transcript of Records' || documentType === 'Transcript of Records (TOR)') {
    baseAmount = Math.ceil(semestersInt / 4) * 100.0;
  } else if (documentType === 'Honorable Dismissal') {
    baseAmount = 100.0;
  }

  return { amount: baseAmount * copiesInt, copies: copiesInt };
}

module.exports = { generateTrackingNumber, calculateAmount };
