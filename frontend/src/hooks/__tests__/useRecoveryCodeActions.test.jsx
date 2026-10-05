import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useRecoveryCodeActions from '@/hooks/useRecoveryCodeActions';
import { downloadRecoveryCodes } from '@/utils/downloadRecoveryCodes';

vi.mock('@/utils/downloadRecoveryCodes', () => ({ downloadRecoveryCodes: vi.fn() }));
const codes = ['SYNTHETIC-ONE', 'SYNTHETIC-TWO'];
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

it('announces success only after the clipboard resolves and guards pending duplicates', async () => {
  let resolve;
  const writeText = vi.fn(() => new Promise(done => { resolve = done; }));
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const { result } = renderHook(() => useRecoveryCodeActions(codes));
  let copying;
  act(() => { copying = result.current.copy(); result.current.copy(); });
  expect(writeText).toHaveBeenCalledExactlyOnceWith(codes.join('\n'));
  expect(result.current.busy).toBe(true);
  expect(result.current.notice).toBe('');
  act(() => result.current.download());
  expect(downloadRecoveryCodes).not.toHaveBeenCalled();
  await act(async () => { resolve(); await copying; });
  expect(result.current.busy).toBe(false);
  expect(result.current.notice).toMatch(/Recovery codes copied/);
});

it('shows an actionable clipboard rejection without exposing the exception or logging codes', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error(codes[0]));
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const store = vi.spyOn(Storage.prototype, 'setItem');
  const { result } = renderHook(() => useRecoveryCodeActions(codes));
  await act(async () => result.current.copy());
  expect(result.current.error).toMatch(/Allow clipboard access.*download/);
  expect(result.current.error).not.toContain(codes[0]);
  expect(result.current.notice).toBe('');
  expect(result.current.busy).toBe(false);
  expect(log).not.toHaveBeenCalled();
  expect(store).not.toHaveBeenCalled();
  writeText.mockResolvedValue(undefined);
  await act(async () => result.current.copy());
  expect(result.current.error).toBe('');
  expect(result.current.notice).toMatch(/copied/);
  log.mockRestore(); store.mockRestore();
});

it('explains missing clipboard support and offers download/manual copy', async () => {
  vi.stubGlobal('navigator', {});
  const { result } = renderHook(() => useRecoveryCodeActions(codes));
  await act(async () => result.current.copy());
  expect(result.current.error).toMatch(/unavailable.*Download.*manually/);
  expect(result.current.notice).toBe('');
});

it('reports a triggered download without treating it as saved to disk', () => {
  const { result } = renderHook(() => useRecoveryCodeActions(codes));
  act(() => result.current.download());
  expect(downloadRecoveryCodes).toHaveBeenCalledExactlyOnceWith(codes);
  expect(result.current.notice).toMatch(/download started.*confirm it completed/);
  expect(result.current.notice).not.toMatch(/saved|successfully/);
});

it('offers retry or copying when a browser download cannot be triggered', () => {
  downloadRecoveryCodes.mockImplementation(() => { throw new Error(codes[0]); });
  const { result } = renderHook(() => useRecoveryCodeActions(codes));
  act(() => result.current.download());
  expect(result.current.error).toMatch(/Try again.*copy/);
  expect(result.current.error).not.toContain(codes[0]);
  expect(result.current.notice).toBe('');
});

it('discards old feedback and ignores clipboard completion after codes are acknowledged/replaced', async () => {
  let resolve;
  vi.stubGlobal('navigator', { clipboard: { writeText: () => new Promise(done => { resolve = done; }) } });
  const { result, rerender } = renderHook(({ values }) => useRecoveryCodeActions(values), { initialProps: { values: codes } });
  act(() => result.current.download());
  expect(result.current.notice).not.toBe('');
  let copying;
  act(() => { copying = result.current.copy(); });
  rerender({ values: [] });
  expect(result.current.busy).toBe(false);
  expect(result.current.notice).toBe('');
  await act(async () => { resolve(); await copying; });
  expect(result.current.notice).toBe('');
  expect(result.current.error).toBe('');
  act(() => result.current.download());
  expect(downloadRecoveryCodes).toHaveBeenCalledOnce();
});

it('ignores a late clipboard completion after unmount', async () => {
  let reject;
  vi.stubGlobal('navigator', { clipboard: { writeText: () => new Promise((_, fail) => { reject = fail; }) } });
  const { result, unmount } = renderHook(() => useRecoveryCodeActions(codes));
  let copying;
  act(() => { copying = result.current.copy(); });
  unmount();
  await act(async () => { reject(new Error('Browser denied access')); await copying; });
});
