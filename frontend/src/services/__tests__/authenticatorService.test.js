import { beforeEach, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { getAuthenticator, beginAuthenticator, updateAuthenticator } from '@/services/authenticatorService';
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('validates status and passes cancellation/deadline to the API', async () => {
  const controller = new AbortController();
  api.get.mockResolvedValueOnce({ data: { enabled: false, available: true } });
  expect(await getAuthenticator(controller.signal)).toHaveProperty('enabled', false);
  expect(api.get).toHaveBeenCalledWith('/auth/authenticator', { timeout: 15000, signal: controller.signal });
  api.get.mockResolvedValueOnce({ data: {} });
  await expect(getAuthenticator()).rejects.toThrow('Invalid');
});
it('does not treat malformed setup or mutation responses as confirmed', async () => {
  api.post.mockResolvedValue({ data: {} });
  await expect(beginAuthenticator('synthetic')).rejects.toThrow('Invalid');
  await expect(updateAuthenticator('enable', {})).rejects.toThrow('Reopen Security');
});
it('sends only the supplied factor proof to the selected mutation', async () => {
  api.post.mockResolvedValue({ data: { token: 'synthetic', user: { id: 3 }, enabled: false } });
  const proof = { current_password: 'synthetic', recovery_code: 'synthetic-recovery' };
  await updateAuthenticator('disable', proof);
  expect(api.post).toHaveBeenCalledWith('/auth/authenticator/disable', proof, { timeout: 15000 });
});
