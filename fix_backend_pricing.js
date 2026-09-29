const fs = require('fs');

let file = 'backend/src/utils/pricing.js';
let content = fs.readFileSync(file, 'utf8');

// We'll replace feeForType, calculateAmount, and calculateGroupAmount.
const newFunctions = `
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
 * Copies are no longer factored into the price computation.
 */
function calculateAmount(documentType, semesters, copies, type) {
  const resolved = type || LEGACY_FEES[documentType] || DEFAULT_FEE;
  return { amount: feeForType(resolved, semesters), copies: 1 };
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
      copies: 1, // Copies removed per CN-08
      semesters: parseInt(item.semesters) || null,
      amount: feeForType(resolved, item.semesters),
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
`;

content = content.replace(/\/\*\*\n \* Fee for one line item\.[\s\S]*$/, newFunctions.trim() + '\n');
fs.writeFileSync(file, content);
