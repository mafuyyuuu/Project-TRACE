// Monetary arithmetic uses integer centavos; the server validates every input.
const MAX_CENTS = 9999999999;
function moneyCents(value) {
  const text = String(value ?? 0);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Fees must be non-negative amounts with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) throw new Error('Fee exceeds the supported amount.');
  return cents;
}
function positiveQuantity(value, label = 'Quantity') {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw new Error(`${label} must be a positive whole number.`);
  return n;
}
function normalizedSchedule(type) {
  if (!type || !['flat', 'per_semester_block'].includes(type.fee_rule || 'flat')) throw new Error('Invalid fee rule.');
  const items = type.fee_items || [];
  if (!Array.isArray(items) || items.length > 30) throw new Error('Use at most 30 named fee items.');
  const names = new Set(['rental fee', 'special fee', 'document fee']);
  const fee_items = items.map(item => {
    if (typeof item?.label !== 'string' || !item.label.trim() || item.label.trim().length > 100) throw new Error('Fee items need a name of at most 100 characters.');
    const label = item.label.trim();
    if (names.has(label.toLowerCase())) throw new Error('Fee item names must be unique; Rental Fee, Special Fee and Document Fee are reserved.');
    names.add(label.toLowerCase());
    return { label, amount: moneyCents(item.amount) / 100 };
  });
  return { version: 1, document_type: type.name || type.document_type || null,
    college_id: type.pricing_college_id ?? type.college_id ?? null,
    source: type.source || 'default', fee_rule: type.fee_rule || 'flat',
    base_fee: moneyCents(type.base_fee) / 100, rental_fee: moneyCents(type.rental_fee) / 100,
    special_fee: moneyCents(type.special_fee) / 100, fee_items };
}
function resolveSchedule(type, collegeId) {
  const override = (type.college_fee_schedules || []).find(row => Number(row.college_id) === Number(collegeId) && collegeId != null);
  return normalizedSchedule({ ...(override || type), name: type.name,
    pricing_college_id: collegeId ?? null, source: override ? 'college' : 'default' });
}
function calculateBreakdown(type, selection = {}, final = false) {
  const schedule = normalizedSchedule(type);
  const copies = positiveQuantity(selection.copies ?? 1, 'Copies');
  const perPage = schedule.fee_rule === 'per_semester_block';
  const pages = perPage ? (final ? positiveQuantity(selection.page_count, 'Pages per copy')
    : Math.ceil(positiveQuantity(selection.semesters ?? 8, 'Semesters') / 4)) : null;
  if (final && !perPage && selection.page_count != null && selection.page_count !== '') positiveQuantity(selection.page_count, 'Pages per copy');
  const units = copies * (pages || 1);
  if (!Number.isSafeInteger(units)) throw new Error('This quantity exceeds the supported request amount.');
  const baseCents = moneyCents(schedule.base_fee);
  const items = [{ label: 'Document Fee', rate: baseCents / 100, units,
    calculation: perPage ? `${pages} pages per copy × ${copies} copies × ₱${(baseCents / 100).toFixed(2)}`
      : `${copies} copies × ₱${(baseCents / 100).toFixed(2)}`, amount: units * baseCents / 100 }];
  for (const item of [{ label: 'Rental Fee', amount: schedule.rental_fee },
    { label: 'Special Fee', amount: schedule.special_fee }, ...schedule.fee_items]) {
    const cents = moneyCents(item.amount);
    if (cents > 0) items.push({ label: item.label, rate: cents / 100, units: 1,
      calculation: `Once per document type in this request × ₱${(cents / 100).toFixed(2)}`, amount: cents / 100 });
  }
  const totalCents = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  if (!Number.isSafeInteger(totalCents) || totalCents > MAX_CENTS) throw new Error('This quantity exceeds the supported request amount.');
  return { version: 1, stage: final ? 'final' : 'estimate', college_id: schedule.college_id,
    source: schedule.source, copies, pages_per_copy: pages, items, total: totalCents / 100 };
}

export { moneyCents, normalizedSchedule, resolveSchedule, calculateBreakdown };
export function itemAmount(type, selection = {}) {
  if (!type) return 0;
  try { return calculateBreakdown(type, { ...selection, copies: Number(selection.copies) > 0 && Number.isInteger(Number(selection.copies)) ? selection.copies : 1 }).total; }
  catch { return 0; }
}
export function groupTotal(types, selections) {
  const byName = new Map((types || []).map(type => [type.name, type]));
  return Object.entries(selections || {}).reduce((sum, [name, selection]) => sum + Math.round(itemAmount(byName.get(name), selection) * 100), 0) / 100;
}
export function formatPeso(amount) { return `₱${(Number(amount) || 0).toFixed(2)}`; }
export function itemBreakdown(type, selection = {}) {
  if (!type) return [];
  try { return calculateBreakdown(type, selection).items; } catch { return []; }
}
