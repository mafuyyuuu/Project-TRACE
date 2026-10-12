import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import useElapsedClock from '@/hooks/useElapsedClock';
import { getWaitTime } from '@/utils/formatters';

afterEach(() => vi.useRealTimers());
it('updates day/week boundaries while open, refreshes on return and removes its timer/listeners', () => {
  vi.useFakeTimers();
  const start = Date.parse('2026-10-06T00:00:00Z');
  vi.setSystemTime(start - 60000);
  const remove = vi.spyOn(window, 'removeEventListener');
  const { result, unmount } = renderHook(() => useElapsedClock());
  const intake = '2026-10-05T00:00:00Z';
  expect(getWaitTime(intake, result.current)).toBe('23 hrs');
  act(() => vi.advanceTimersByTime(60000));
  expect(getWaitTime(intake, result.current)).toBe('1 day');
  act(() => { vi.setSystemTime(start + 6 * 86400000); window.dispatchEvent(new Event('focus')); });
  expect(getWaitTime(intake, result.current)).toBe('1 week');
  act(() => { vi.setSystemTime(start + 13 * 86400000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(getWaitTime(intake, result.current)).toBe('2 weeks');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith('focus', expect.any(Function));
  remove.mockRestore();
});
