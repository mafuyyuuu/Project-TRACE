import { expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useNotificationDismissal from '@/hooks/useNotificationDismissal';

it('dismisses on route events, internal tab changes, and leaving the browser tab', () => {
  const dismiss = vi.fn();
  const { rerender, unmount } = renderHook(({ tab }) => useNotificationDismissal(dismiss, tab),
    { initialProps: { tab: 'intake' } });
  expect(dismiss).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event('trace:notification-navigation')));
  expect(dismiss).toHaveBeenCalledTimes(1);
  rerender({ tab: 'release' });
  expect(dismiss).toHaveBeenCalledTimes(2);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(dismiss).toHaveBeenCalledTimes(3);
  unmount();
  act(() => window.dispatchEvent(new Event('trace:notification-navigation')));
  expect(dismiss).toHaveBeenCalledTimes(3);
  vi.restoreAllMocks();
});

it('does not dismiss feedback just because its callback or the same tab rerenders', () => {
  const dismiss = vi.fn();
  const { rerender } = renderHook(() => useNotificationDismissal(() => dismiss(), 'same'));
  rerender();
  expect(dismiss).not.toHaveBeenCalled();
});
