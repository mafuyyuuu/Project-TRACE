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
  const rentalFee = parseFloat(type.rental_fee) || 0;
  const specialFee = parseFloat(type.special_fee) || 0;
  const copies = parseInt(selection.copies) || 1;

  if (type.fee_rule === 'per_semester_block') {
    const semesters = parseInt(selection.semesters) || 8;
    return (Math.ceil(semesters / 4) * baseFee * copies) + rentalFee + specialFee;
  }

  return (baseFee * copies) + rentalFee + specialFee;
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

/**
 * Detailed fee itemization for a document request.
 */
export function itemBreakdown(type, selection = {}) {
  if (!type) return [];
  const baseFee = parseFloat(type.base_fee) || 0;
  const rentalFee = parseFloat(type.rental_fee) || 0;
  const specialFee = parseFloat(type.special_fee) || 0;
  const copies = parseInt(selection.copies) || 1;
  const breakdown = [];

  if (type.fee_rule === 'per_semester_block') {
    const semesters = parseInt(selection.semesters) || 8;
    const pages = Math.ceil(semesters / 4);
    const documentFee = pages * baseFee * copies;
    breakdown.push({ label: `Document Fee (${pages} page${pages>1?'s':''} × ${copies} cop${copies>1?'ies':'y'})`, amount: documentFee });
  } else {
    const documentFee = baseFee * copies;
    if (documentFee > 0) {
      breakdown.push({ label: `Document Fee (${copies} cop${copies>1?'ies':'y'})`, amount: documentFee });
    }
  }

  if (rentalFee > 0) breakdown.push({ label: 'Rental Fee', amount: rentalFee });
  if (specialFee > 0) breakdown.push({ label: 'Special Fee', amount: specialFee });

  return breakdown;
}
