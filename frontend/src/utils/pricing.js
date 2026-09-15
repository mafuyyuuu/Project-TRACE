/**
 * Client-side fee preview for the request form.
 *
 * This mirrors `backend/src/utils/pricing.js` so the student sees the right
 * total before submitting — but it is only a preview. The server always
 * recomputes the real charge from `document_types`, and a client-sent amount is
 * ignored, so a mismatch here can never affect what is actually billed.
 */

/**
 * Fee for one selected document type.
 *
 * @param {{base_fee: number|string, fee_rule: string}} type row from /reference/document-types
 * @param {{copies?: number|string, semesters?: number|string}} selection
 * @returns {number}
 */
export function itemAmount(type, selection = {}) {
  if (!type) return 0;

  const baseFee = parseFloat(type.base_fee) || 0;
  const copies = parseInt(selection.copies) || 1;

  if (type.fee_rule === 'per_semester_block') {
    const semesters = parseInt(selection.semesters) || 8;
    return Math.ceil(semesters / 4) * baseFee * copies;
  }

  return baseFee * copies;
}

/**
 * Combined total for everything currently selected — what the student pays once.
 *
 * @param {Array} types all document types
 * @param {Object} selections keyed by document type name
 * @returns {number}
 */
export function groupTotal(types, selections) {
  const byName = new Map((types || []).map((t) => [t.name, t]));
  const sum = Object.entries(selections || {}).reduce(
    (total, [name, selection]) => total + itemAmount(byName.get(name), selection),
    0
  );
  // Rounded to cents so repeated float addition can't show a drifting total.
  return Math.round(sum * 100) / 100;
}

/** Peso display, e.g. 250 → "₱250.00". */
export function formatPeso(amount) {
  return `₱${(Number(amount) || 0).toFixed(2)}`;
}
