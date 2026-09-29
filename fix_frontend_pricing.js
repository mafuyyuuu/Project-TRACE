const fs = require('fs');
let file = 'frontend/src/utils/pricing.js';
let content = fs.readFileSync(file, 'utf8');

const newFunctions = `
/**
 * Fee for one line item.
 */
export function feeForType(type, semesters) {
  if (!type) return 0;
  const baseFee = parseFloat(type.base_fee) || 0;
  if (type.fee_rule === 'per_semester_block') {
    const semestersInt = parseInt(semesters) || 8;
    return Math.ceil(semestersInt / 4) * baseFee;
  }
  return baseFee;
}

/**
 * Calculates the amount for a single item from the frontend's \`selections\` map.
 */
export function itemAmount(type, selection = {}) {
  return feeForType(type, selection.semesters);
}

/**
 * Calculates the running total of a multi-document request.
 */
export function groupTotal(documentTypes, selections) {
  if (!documentTypes || !selections) return 0;
  
  let total = 0;
  for (const [name, selection] of Object.entries(selections)) {
    const type = documentTypes.find(t => t.name === name);
    if (type) {
      total += itemAmount(type, selection);
    }
  }
  
  return total;
}
`;

content = content.replace(/\/\*\*\n \* Fee for one line item\.[\s\S]*$/, newFunctions.trim() + '\n');
fs.writeFileSync(file, content);
