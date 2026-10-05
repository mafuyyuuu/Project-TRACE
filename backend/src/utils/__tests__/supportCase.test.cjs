const { isCaseReadOnly, assertCaseWritable } = require('../supportCase');
const { PIPELINE } = require('../documentStatus');
it.each(PIPELINE.filter(value => value !== 'COMPLETED'))('preserves open pipeline case %s', value => {
  expect(isCaseReadOnly(value)).toBe(false);
  expect(() => assertCaseWritable(value)).not.toThrow();
});
it.each(['COMPLETED', 'APPROVED', 'REJECTED', 'unknown', null, undefined])('fails closed for %s', value => {
  expect(isCaseReadOnly(value)).toBe(true);
  expect(() => assertCaseWritable(value)).toThrow(/read-only/);
});
