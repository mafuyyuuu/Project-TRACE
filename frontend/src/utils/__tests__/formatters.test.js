import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatFileSize, getRelativeTime, getWaitTime } from '@/utils/formatters';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Freeze the clock so relative-time assertions are deterministic. */
function freezeClock() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-22T12:00:00Z'));
}
const ago = (ms) => new Date(Date.now() - ms).toISOString();

afterEach(() => {
  vi.useRealTimers();
});

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1 MB'],
    [245800, '240 KB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it('treats missing input as zero rather than crashing', () => {
    expect(formatFileSize(undefined)).toBe('0 B');
    expect(formatFileSize(null)).toBe('0 B');
  });
});

describe('getRelativeTime', () => {
  it('renders an em dash when there is no date', () => {
    expect(getRelativeTime(null)).toBe('—');
    expect(getRelativeTime(undefined)).toBe('—');
  });

  it.each([
    [0, 'Just now'],
    [1 * MINUTE, '1 min ago'],
    [5 * MINUTE, '5 mins ago'],
    [1 * HOUR, '1 hr ago'],
    [3 * HOUR, '3 hrs ago'],
    [1 * DAY, '1 day ago'],
    [4 * DAY, '4 days ago'],
  ])('renders %i ms ago as "%s"', (elapsed, expected) => {
    freezeClock();
    expect(getRelativeTime(ago(elapsed))).toBe(expected);
  });

  it('singularises exactly one unit and pluralises the rest', () => {
    freezeClock();
    expect(getRelativeTime(ago(1 * MINUTE))).not.toContain('mins');
    expect(getRelativeTime(ago(2 * MINUTE))).toContain('mins');
  });
});

describe('getWaitTime', () => {
  it('renders an em dash when there is no date', () => {
    expect(getWaitTime(null)).toBe('—');
  });

  it.each([
    [0, '< 1 min'],
    [1 * MINUTE, '1 min'],
    [30 * MINUTE, '30 mins'],
    [1 * HOUR, '1 hr'],
    [5 * HOUR, '5 hrs'],
  ])('renders %i ms of waiting as "%s"', (elapsed, expected) => {
    freezeClock();
    expect(getWaitTime(ago(elapsed))).toBe(expected);
  });

  it('omits the "ago" suffix used by getRelativeTime, since this is a duration', () => {
    freezeClock();
    expect(getWaitTime(ago(5 * MINUTE))).not.toContain('ago');
  });
});
