import { describe, expect, it } from 'vitest';
import { forecastCeiling } from '@/utils/forecastScale';
import { formatDateTime } from '@/utils/formatters';
import { LEGACY_STATUS, PIPELINE, getProgressVal, getStatusTone, isLegacyClosed } from '@/utils/documentStatus';
import { INPUT_LIMITS } from '@/utils/inputLimits';

describe('Batch 8 presentation helpers', () => {
  it('keeps forecast headroom and a non-zero empty scale', () => {
    expect(forecastCeiling([])).toBe(5);
    expect(forecastCeiling([{ predicted_volume: 10 }, { predicted_volume: 8 }])).toBe(15);
    expect(forecastCeiling([{ predicted_volume: 100 }])).toBe(120);
  });
  it('formats timestamps in Philippine time and handles unavailable values', () => {
    expect(formatDateTime('2026-09-30T00:00:00Z')).toMatch(/Sep 30, 2026.*8:00/);
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('invalid')).toBe('—');
  });
  it.each([LEGACY_STATUS.REJECTED, LEGACY_STATUS.APPROVED])('keeps %s outside active progress', status => {
    expect(isLegacyClosed(status)).toBe(true);
    expect(getProgressVal(status)).toBe(0);
    expect(PIPELINE).not.toContain(status);
  });
  it('distinguishes a rejected legacy record', () => expect(getStatusTone(LEGACY_STATUS.REJECTED)).toContain('text-red-'));
  it('keeps approved credential and contact limits explicit', () => {
    expect(INPUT_LIMITS).toMatchObject({ id: 50, phone: 20, email: 255, password: 64, notes: 2000 });
  });
});
