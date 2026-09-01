import { describe, it, expect } from 'vitest';
import { itemAmount, groupTotal, formatPeso } from '@/utils/pricing';

/**
 * The client total is a preview only — the server recomputes the real charge.
 * These tests exist so the preview never disagrees with it, which would be a
 * confusing surprise at checkout.
 */

// Rows exactly as /reference/document-types returns them.
const TOR = { name: 'Transcript of Records', base_fee: 100, fee_rule: 'per_semester_block' };
const DIPLOMA = { name: 'Diploma', base_fee: 50, fee_rule: 'flat' };
const HD = { name: 'Honorable Dismissal', base_fee: 100, fee_rule: 'flat' };
const TYPES = [TOR, DIPLOMA, HD];

describe('itemAmount', () => {
  it('charges a flat fee once per copy', () => {
    expect(itemAmount(DIPLOMA, { copies: 1 })).toBe(50);
    expect(itemAmount(DIPLOMA, { copies: 3 })).toBe(150);
  });

  it.each([
    [4, 100],
    [5, 200],
    [8, 200],
    [9, 300],
  ])('charges TOR per 4-semester block: %i semesters = %i', (semesters, expected) => {
    expect(itemAmount(TOR, { semesters, copies: 1 })).toBe(expected);
  });

  it('multiplies the TOR block fee by copies too', () => {
    expect(itemAmount(TOR, { semesters: 8, copies: 2 })).toBe(400);
  });

  it('defaults to 1 copy and 8 semesters when unspecified', () => {
    expect(itemAmount(TOR, {})).toBe(200);
    expect(itemAmount(DIPLOMA, {})).toBe(50);
  });

  it('treats invalid copies as 1 rather than producing NaN', () => {
    expect(itemAmount(DIPLOMA, { copies: 'abc' })).toBe(50);
    expect(itemAmount(DIPLOMA, { copies: 0 })).toBe(50);
  });

  it('returns 0 for an unknown type instead of crashing the form', () => {
    expect(itemAmount(undefined, { copies: 2 })).toBe(0);
    expect(itemAmount(null, {})).toBe(0);
  });

  it('accepts the string fees MySQL returns', () => {
    expect(itemAmount({ base_fee: '75.00', fee_rule: 'flat' }, { copies: 2 })).toBe(150);
  });
});

describe('groupTotal', () => {
  it('sums a mixed selection — the figure the student actually pays', () => {
    const selections = {
      'Transcript of Records': { semesters: 8, copies: 1 }, // 200
      Diploma: { copies: 1 },                               // 50
    };
    expect(groupTotal(TYPES, selections)).toBe(250);
  });

  it('is zero when nothing is selected', () => {
    expect(groupTotal(TYPES, {})).toBe(0);
    expect(groupTotal(TYPES, null)).toBe(0);
  });

  it('grows and shrinks as types are ticked and unticked', () => {
    const one = { Diploma: { copies: 1 } };
    const two = { ...one, 'Honorable Dismissal': { copies: 1 } };
    expect(groupTotal(TYPES, one)).toBe(50);
    expect(groupTotal(TYPES, two)).toBe(150);
  });

  it('matches the sum of its individual items', () => {
    const selections = {
      'Transcript of Records': { semesters: 12, copies: 2 },
      'Honorable Dismissal': { copies: 3 },
    };
    const expected =
      itemAmount(TOR, selections['Transcript of Records']) +
      itemAmount(HD, selections['Honorable Dismissal']);
    expect(groupTotal(TYPES, selections)).toBe(expected);
  });

  it('ignores a selection whose type is not in the list', () => {
    expect(groupTotal(TYPES, { 'Deleted Type': { copies: 2 } })).toBe(0);
  });

  it('rounds to cents rather than showing float drift', () => {
    const cents = [{ name: 'A', base_fee: 0.1, fee_rule: 'flat' }, { name: 'B', base_fee: 0.2, fee_rule: 'flat' }];
    expect(groupTotal(cents, { A: { copies: 1 }, B: { copies: 1 } })).toBe(0.3);
  });
});

describe('formatPeso', () => {
  it.each([
    [250, '₱250.00'],
    [0, '₱0.00'],
    [1234.5, '₱1234.50'],
    ['100.00', '₱100.00'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatPeso(input)).toBe(expected);
  });

  it('degrades to zero for junk rather than showing NaN', () => {
    expect(formatPeso(undefined)).toBe('₱0.00');
    expect(formatPeso('abc')).toBe('₱0.00');
  });
});
