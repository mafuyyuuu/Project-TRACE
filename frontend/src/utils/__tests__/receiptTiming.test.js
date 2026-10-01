import { receiptWait } from '@/utils/receiptTiming';
import { expect, it } from 'vitest';
it('shows actual elapsed waiting time with days and hours', () => {
  expect(receiptWait('2026-10-01T08:00:00Z', Date.parse('2026-10-02T10:35:00Z'))).toBe('1d 2h 35m waiting for OR');
});
it('never invents a date for historical rows or negative wait for clock skew', () => {
  expect(receiptWait(null)).toBe('Clearance time not recorded');
  expect(receiptWait('bad')).toBe('Clearance time not recorded');
  expect(receiptWait('2026-10-01T08:00:00Z', Date.parse('2026-10-01T07:59:00Z'))).toBe('0m waiting for OR');
});
