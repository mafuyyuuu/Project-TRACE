import api from '@/services/api';
import { login, verify2FA } from '@/services/authService';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/services/api', () => ({ default: { post: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  api.post.mockResolvedValue({ data: { requires_2fa: true } });
});

it.each([undefined, true, 'false', 0])('defaults omitted or malformed mode %s to shared', async sharedComputer => {
  await login({ employeeId: 'CLERK001', password: 'test-password', sharedComputer });
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/login', {
    employee_id: 'CLERK001', password: 'test-password', shared_computer: true,
  });
});

it('sends explicit personal mode without changing the credential fields', async () => {
  expect(await login({ employeeId: 'CLERK001', password: 'test-password', sharedComputer: false })).toEqual({ requires_2fa: true });
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/login', {
    employee_id: 'CLERK001', password: 'test-password', shared_computer: false,
  });
});

it('passes the OTP challenge and explicit trust choice to verification', async () => {
  const payload = { temp_token: 'synthetic-challenge', otp: '123456', trust_browser: true };
  await verify2FA(payload);
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/verify-2fa', payload);
});
