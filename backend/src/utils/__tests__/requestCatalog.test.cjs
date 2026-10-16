const { REQUEST_CATALOG, SET_NAMES } = require('../requestCatalog');
const { calculateBreakdown, normalizedSchedule } = require('../pricing');
const byName = name => REQUEST_CATALOG.find(row => row.name === name);
it('contains one COR option, excludes the six Nursing options, and does not invent the Underload fee', () => {
  expect(REQUEST_CATALOG.filter(row => /Certificate of Registration/.test(row.name))).toHaveLength(1);
  expect(REQUEST_CATALOG.some(row => /^BSN |^Nursing Hours$/.test(row.name))).toBe(false);
  expect(byName('Certificate of Underload Units')).toMatchObject({ fee_pending: true });
  expect(new Set(REQUEST_CATALOG.map(row => row.name)).size).toBe(REQUEST_CATALOG.length);
});
it.each(SET_NAMES.filter(name => name !== 'For Masters' && name !== 'Transfer Credentials'))('prices %s as a flat dismissal plus actual transcript pages', name => {
  const type = byName(name), label = type.fee_items[0].label;
  expect(calculateBreakdown(type, { copies: 1, fee_page_counts: { [label]: 3 } }, true).total).toBe(400);
});
it('prices Masters dismissal pages independently from transcript pages', () => {
  const type = byName('For Masters'), label = type.fee_items[0].label;
  expect(calculateBreakdown(type, { copies: 1, page_count: 2, fee_page_counts: { [label]: 4 } }, true).total).toBe(600);
});
it('keeps transfer Copy of Grade at 50/page and standalone Copy of Grades at 100/page', () => {
  const type = byName('Transfer Credentials');
  expect(calculateBreakdown(type, { fee_page_counts: { 'Copy of Grade': 2, 'Transcript of Records': 3 } }, true).total).toBe(500);
  expect(calculateBreakdown(byName('Copy of Grades'), { page_count: 2 }, true).total).toBe(200);
});
it('charges CAV 80 plus 100 per CTC attachment page per copy', () => {
  expect(calculateBreakdown(byName('CHED-CAV'), { copies: 2, fee_page_counts: { 'CTC Attachment': 3 } }, true).total).toBe(760);
});
it('does not derive a new per-page estimate from semesters or accept missing component pages', () => {
  expect(calculateBreakdown(byName('Transcript of Records for Employment'), { semesters: 99 }).total).toBe(100);
  expect(() => calculateBreakdown(byName('Transfer Credentials'), { fee_page_counts: { 'Copy of Grade': 2 } }, true)).toThrow(/Transcript of Records/);
});
it.each([0, -1, 1.5, 'invalid', 2147483648])('rejects invalid component page count %s', value => {
  expect(() => calculateBreakdown(byName('CHED-CAV'), { fee_page_counts: { 'CTC Attachment': value } }, true)).toThrow(/positive whole/);
});
it('retains per-page components in the saved fee schedule and rejects unsupported fee bases', () => {
  expect(normalizedSchedule(byName('CHED-CAV')).fee_items[0].fee_rule).toBe('per_page');
  expect(() => normalizedSchedule({ fee_items: [{ label: 'Test', amount: 10, fee_rule: 'guessed' }] })).toThrow(/rule/);
});

it('keeps an unspecified fee pending in snapshots and refuses to bill it as free', () => {
  const type = byName('Certificate of Underload Units');
  expect(normalizedSchedule(type).fee_pending).toBe(true);
  expect(calculateBreakdown(type).total).toBe(0);
  expect(() => calculateBreakdown(type, {}, true)).toThrow(/confirmation/);
});
