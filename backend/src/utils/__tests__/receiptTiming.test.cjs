const { receiptWindow, validReceiptDate } = require('../receiptTiming');
it.each([
  ['2026-10-01T07:59:59Z', false, '2026-10-01'],
  ['2026-10-01T08:00:00Z', true, '2026-10-02'],
  ['2026-12-31T15:59:59Z', true, '2027-01-01'],
  ['2027-01-01T16:00:00Z', false, '2027-01-02'],
])('enforces Manila cutoff independent of server timezone: %s', (value, afterCutoff, earliestDate) => {
  expect(receiptWindow(new Date(value))).toMatchObject({ afterCutoff, earliestDate });
});
it.each(['2026-02-29', '2026-13-01', '2026-1-01', 'today', null])('rejects invalid receipt dates %s', value => expect(validReceiptDate(value)).toBe(false));
it('accepts a real leap date', () => expect(validReceiptDate('2028-02-29')).toBe(true));
