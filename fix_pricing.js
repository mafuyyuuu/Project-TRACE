const fs = require('fs');

function updatePricing(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Update itemAmount to include rental and special fees
  content = content.replace(
    "const baseFee = parseFloat(type.base_fee) || 0;",
    "const baseFee = parseFloat(type.base_fee) || 0;\n  const rentalFee = parseFloat(type.rental_fee) || 0;\n  const specialFee = parseFloat(type.special_fee) || 0;"
  );

  content = content.replace(
    "return Math.ceil(semesters / 4) * baseFee * copies;",
    "return (Math.ceil(semesters / 4) * baseFee * copies) + rentalFee + specialFee;"
  );

  content = content.replace(
    "return baseFee * copies;",
    "return (baseFee * copies) + rentalFee + specialFee;"
  );

  // Add itemBreakdown
  const breakdownFunc = `
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
    breakdown.push({ label: \`Document Fee (\${pages} page\${pages>1?'s':''} × \${copies} cop\${copies>1?'ies':'y'})\`, amount: documentFee });
  } else {
    const documentFee = baseFee * copies;
    if (documentFee > 0) {
      breakdown.push({ label: \`Document Fee (\${copies} cop\${copies>1?'ies':'y'})\`, amount: documentFee });
    }
  }

  if (rentalFee > 0) breakdown.push({ label: 'Rental Fee', amount: rentalFee });
  if (specialFee > 0) breakdown.push({ label: 'Special Fee', amount: specialFee });

  return breakdown;
}
`;
  if (!content.includes('function itemBreakdown')) {
    content += breakdownFunc;
  }
  
  if (file.includes('backend')) {
    content = content.replace(/export function /g, 'function ');
    content = content.replace('module.exports = {', 'module.exports = {\n  itemBreakdown,');
  }

  fs.writeFileSync(file, content);
}

updatePricing('frontend/src/utils/pricing.js');
updatePricing('backend/src/utils/pricing.js');
