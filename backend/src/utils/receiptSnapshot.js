const { badRequest } = require('./AppError');
const { receiptStudentName } = require('./receiptStudentName');
const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function wholeWords(value) {
  if (value < 20) return ones[value];
  if (value < 100) return tens[Math.floor(value / 10)] + (value % 10 ? ' ' + ones[value % 10] : '');
  if (value < 1000) return ones[Math.floor(value / 100)] + ' Hundred' + (value % 100 ? ' ' + wholeWords(value % 100) : '');
  for (const [scale, label] of [[1000000000,'Billion'],[1000000,'Million'],[1000,'Thousand']]) if (value >= scale) return wholeWords(Math.floor(value / scale)) + ' ' + label + (value % scale ? ' ' + wholeWords(value % scale) : '');
}
function cents(value) {
  const text = String(value ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw badRequest('A saved receipt amount is missing or invalid.');
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 999999999999) throw badRequest('The receipt amount exceeds the supported range.');
  return amount;
}
function amountWords(amount) {
  return `${wholeWords(Math.floor(amount / 100))} Pesos and ${String(amount % 100).padStart(2, '0')}/100`;
}
function snapshot(group, user, serial, date) {
  if (!group.length || group.some(row => row.student_id !== group[0].student_id)) throw badRequest('The receipt group has inconsistent student records.');
  const name = receiptStudentName(group[0]);
  if (!name || name.length > 255) throw badRequest('Review the receipt payor name.');
  const items = group.map(row => ({ document_id: row.id, document_type: row.document_type, amount_centavos: cents(row.amount), fund_code: '', account_code: '' }));
  const total = items.reduce((sum, item) => sum + item.amount_centavos, 0);
  if (!Number.isSafeInteger(total) || total > 999999999999) throw badRequest('The receipt total exceeds the supported range.');
  const references = [...new Set(group.map(row => row.payment_reference_id || row.gcash_reference_no || '').filter(Boolean))];
  if (references.length > 1) throw badRequest('The payment group has inconsistent payment references.');
  return { version: 1, serial, issue_date: date, student_id: group[0].student_id, payor_name: name,
    saved_student_name: group[0].student_name, items, total_centavos: total, amount_words: amountWords(total),
    payment_reference: references[0] || '', payment_method: group[0].payment_method || (group[0].payment_channel === 'walk_in' ? 'cash' : ''), cashier_id: user.id, cashier_name: user.full_name };
}
const DEFAULT_PRINT = { width_mm: 150, height_mm: 290, margin_mm: 5, offset_x_mm: 0, offset_y_mm: 0 };
function printConfig(input = {}) {
  const limits = { width_mm: [100,300], height_mm: [200,500], margin_mm: [0,20], offset_x_mm: [-30,30], offset_y_mm: [-30,30] };
  const result = {};
  for (const [key, range] of Object.entries(limits)) {
    const value = Number(input[key] ?? DEFAULT_PRINT[key]);
    if (!Number.isFinite(value) || value < range[0] || value > range[1]) throw badRequest(`Choose a valid ${key.replaceAll('_',' ')} (${range.join(' to ')}).`);
    result[key] = value;
  }
  return result;
}
module.exports = { snapshot, cents, amountWords, DEFAULT_PRINT, printConfig };
