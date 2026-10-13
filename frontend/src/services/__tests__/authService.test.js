import api from '@/services/api';
import { extractSignupId, forgotPassword, login, verify2FA } from '@/services/authService';
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

it('bounds the forgot-password wait while preserving its identifier payload', async () => {
  await forgotPassword('FINANCE001');
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/auth/forgot-password', { identifier: 'FINANCE001' }, { timeout: 60000 });
});

it('allows the server ID deadline to return its fallback before the browser times out', async () => {
  const file = new File(['synthetic'], 'proof.png', { type: 'image/png' });
  const controller = new AbortController();
  await extractSignupId(file, { signal: controller.signal });
  const [url, form, options] = api.post.mock.calls[0];
  expect(url).toBe('/ai/extract-id');
  expect(form.get('id_proof')).toBe(file);
  expect(options.timeout).toBe(75000);
  expect(options.signal).toBe(controller.signal);
});
