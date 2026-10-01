import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import useQuickGuide from '@/hooks/useQuickGuide';
import { startFirstLoginGuide } from '@/services/onboardingService';
vi.mock('@/services/onboardingService', () => ({ startFirstLoginGuide: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });
it('claims once in StrictMode and does not automatically reopen after navigation', async () => {
  startFirstLoginGuide.mockResolvedValue(true);
  const { result, rerender } = renderHook(({ eligible }) => useQuickGuide(3, eligible), { initialProps: { eligible: true }, wrapper: StrictMode });
  await waitFor(() => expect(result.current.open).toBe(true));
  expect(startFirstLoginGuide).toHaveBeenCalledOnce();
  act(() => result.current.close());
  rerender({ eligible: false }); rerender({ eligible: true });
  expect(result.current.open).toBe(false);
  expect(startFirstLoginGuide).toHaveBeenCalledOnce();
  act(() => result.current.show());
  expect(result.current.open).toBe(true);
});
it('keeps existing accounts and a returning browser quiet when the server declines the claim', async () => {
  startFirstLoginGuide.mockResolvedValue(false);
  const { result } = renderHook(() => useQuickGuide(3, true));
  await waitFor(() => expect(startFirstLoginGuide).toHaveBeenCalledOnce());
  expect(result.current.open).toBe(false);
});
it('waits for required onboarding and isolates a changed account', async () => {
  startFirstLoginGuide.mockResolvedValue(false);
  const { rerender } = renderHook(({ id, eligible }) => useQuickGuide(id, eligible), { initialProps: { id: 3, eligible: false } });
  expect(startFirstLoginGuide).not.toHaveBeenCalled();
  rerender({ id: 3, eligible: true });
  await waitFor(() => expect(startFirstLoginGuide).toHaveBeenCalledTimes(1));
  rerender({ id: 4, eligible: true });
  await waitFor(() => expect(startFirstLoginGuide).toHaveBeenCalledTimes(2));
});
it('keeps manual help available when the automatic check fails', async () => {
  startFirstLoginGuide.mockRejectedValue(new Error('Offline'));
  const { result } = renderHook(() => useQuickGuide(3, true));
  await act(async () => {});
  expect(result.current.open).toBe(false);
  act(() => result.current.show());
  expect(result.current.open).toBe(true);
});
