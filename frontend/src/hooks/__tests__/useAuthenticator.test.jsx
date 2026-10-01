import { beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import useAuthenticator from '@/hooks/useAuthenticator';
import * as api from '@/services/authenticatorService';
import { disconnectRealtime } from '@/services/realtimeService';
vi.mock('@/services/authenticatorService', () => ({ getAuthenticator: vi.fn(), beginAuthenticator: vi.fn(), updateAuthenticator: vi.fn() }));
vi.mock('@/services/realtimeService', () => ({ disconnectRealtime: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  api.getAuthenticator.mockResolvedValue({ enabled: false, available: true });
});
it('displays unavailable status and retries a failed load', async () => {
  api.getAuthenticator.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ enabled: false, available: false });
  const { result } = renderHook(() => useAuthenticator(3));
  await waitFor(() => expect(result.current.error).toContain('Retry'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.status.available).toBe(false));
});
it('blocks pending duplicates and never stores setup secrets or recovery codes in browser storage', async () => {
  const store = vi.spyOn(localStorage, 'setItem');
  let resolve; api.beginAuthenticator.mockImplementation(() => new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => useAuthenticator(3));
  await waitFor(() => expect(result.current.status).not.toBeNull());
  let pending;
  act(() => { pending = result.current.run('setup', { current_password: 'synthetic' }); });
  await act(async () => result.current.run('setup', { current_password: 'synthetic' }));
  expect(api.beginAuthenticator).toHaveBeenCalledOnce();
  await act(async () => { resolve({ secret: 'PRIVATE-SETUP' }); await pending; });
  expect(store).not.toHaveBeenCalled();
  api.updateAuthenticator.mockResolvedValue({ token: 'new-session', user: { id: 3 }, enabled: true, recovery_codes: ['PRIVATE-CODE'] });
  await act(async () => result.current.run('enable', {}));
  expect(localStorage.getItem('trace_token')).toBe('new-session');
  expect(JSON.stringify(store.mock.calls)).not.toMatch(/PRIVATE/);
  expect(disconnectRealtime).toHaveBeenCalledOnce();
});
it('retains setup on failed verification and does not replace the current session', async () => {
  api.beginAuthenticator.mockResolvedValue({ secret: 'PRIVATE-SETUP' });
  api.updateAuthenticator.mockRejectedValue({ response: { data: { error: 'Invalid verification code.' } } });
  const { result } = renderHook(() => useAuthenticator(3));
  await waitFor(() => expect(result.current.status).not.toBeNull());
  await act(async () => result.current.run('setup', {}));
  await act(async () => result.current.run('enable', {}));
  expect(result.current.setup.secret).toBe('PRIVATE-SETUP');
  expect(result.current.error).toContain('Invalid');
  expect(localStorage.getItem('trace_token')).toBeNull();
});
