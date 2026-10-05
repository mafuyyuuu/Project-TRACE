import { describe, expect, it } from 'vitest';
import { getWorkloadShares } from '@/utils/workloadShare';

describe('staff workload share', () => {
  it('uses the total, including staff on other display pages', () => {
    const rows = [60, 30, 10].map((documents_handled, id) => ({ id, documents_handled }));
    const shares = getWorkloadShares(rows);
    expect(shares.map(row => row.share)).toEqual([60, 30, 10]);
    expect(shares.slice(0, 1)[0].share).toBe(60);
    expect(shares.slice(1, 2)[0].share).toBe(30);
    expect(shares.slice(2, 3)[0].share).toBe(10);
    expect(rows[0]).not.toHaveProperty('share');
  });

  it('does not depend on sorting and preserves a useful decimal percentage', () => {
    expect(getWorkloadShares([{ documents_handled: '1' }, { documents_handled: '2' }]).map(row => row.share)).toEqual([33.3, 66.7]);
  });

  it('handles empty, zero-total and invalid counts without NaN or division by zero', () => {
    expect(getWorkloadShares()).toEqual([]);
    expect(getWorkloadShares([])).toEqual([]);
    const rows = [0, '0', null, undefined, -1, Infinity, 'invalid'].map(documents_handled => ({ documents_handled }));
    expect(getWorkloadShares(rows).map(row => row.share)).toEqual(rows.map(() => 0));
  });
});
