const { DEFAULTS, liveWindow, serviceMilliseconds, validateSettings } = require('../supportHours');
it('includes Monday 08:00 and excludes Thursday 16:00 Manila', () => {
  expect(liveWindow('2026-10-05T00:00:00Z').open).toBe(true);
  expect(liveWindow('2026-10-08T08:00:00Z')).toMatchObject({ open: false, next_opens_at: '2026-10-12T00:00:00.000Z' });
});
it.each(['2026-10-09T04:00:00Z', '2026-10-10T04:00:00Z', '2026-10-11T04:00:00Z'])('retains a next opening on closed weekday %s', now => {
  expect(liveWindow(now)).toMatchObject({ open: false, next_opens_at: '2026-10-12T00:00:00.000Z' });
});
it('excludes closed calendar exceptions from next opening and elapsed service time', () => {
  const settings = { ...DEFAULTS, closed_dates: ['2026-10-12'] };
  expect(liveWindow('2026-10-08T08:00:00Z', settings).next_opens_at).toBe('2026-10-13T00:00:00.000Z');
  expect(serviceMilliseconds('2026-10-08T07:59:00Z', '2026-10-13T00:02:00Z', settings)).toBe(180000);
});
it('counts only open minutes across evening and weekend pauses', () => {
  expect(serviceMilliseconds('2026-10-08T07:58:00Z', '2026-10-12T00:03:00Z')).toBe(300000);
  expect(serviceMilliseconds('2026-10-05T07:59:00Z', '2026-10-06T00:02:00Z')).toBe(180000);
});
it('returns zero for an empty or reversed interval', () => {
  expect(serviceMilliseconds('bad', new Date())).toBe(0);
  expect(serviceMilliseconds('2026-10-05', '2026-10-04')).toBe(0);
});
it('accepts the approved visible defaults and copies mutable settings', () => {
  const saved = validateSettings(DEFAULTS); saved.weekdays.push(5);
  expect(DEFAULTS.weekdays).toEqual([1, 2, 3, 4]);
});
it.each([{ weekdays: [] }, { weekdays: [1, 1] }, { weekdays: ['1'] }, { open_minute: 960 }, { close_minute: 1600 }, { warning_minutes: 5 }, { timeout_minutes: 61 }, { closed_dates: ['2026-02-30'] }, { closed_dates: ['2026-01-01', '2026-01-01'] }])('rejects malformed settings %j', change => {
  expect(() => validateSettings({ ...DEFAULTS, ...change })).toThrow();
});
