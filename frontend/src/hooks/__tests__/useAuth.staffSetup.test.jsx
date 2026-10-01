import { beforeEach, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { login } from '@/services/authService';
vi.mock('@/services/authService', () => ({ login: vi.fn(), getMe: vi.fn(), register: vi.fn(), endSession: vi.fn() }));
vi.mock('@/services/realtimeService', () => ({ disconnectRealtime: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
it('never caches a session or navigates as an authenticated user when staff enrollment is required', async () => {
  login.mockResolvedValue({ requires_authenticator_setup: true });
  const { result } = renderHook(() => useAuth(), { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
  let response;
  await act(async () => { response = await result.current.login({ employeeId: 'FINANCE001', password: 'synthetic-password' }); });
  expect(response).toEqual({ requires_authenticator_setup: true });
  expect(result.current.user).toBeNull();
  expect(localStorage.getItem('trace_token')).toBeNull();
  expect(localStorage.getItem('trace_user')).toBeNull();
});
