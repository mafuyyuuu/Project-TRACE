const devices = require('../../models/userDevice.model');
const notifications = require('../notification.service');
const service = require('../deviceLogin.service');
const user = { id: 3, email: 'test@example.com' };
beforeEach(() => {
  vi.spyOn(devices, 'record').mockResolvedValue(true);
  vi.spyOn(notifications, 'notifyInApp').mockResolvedValue({ ok: true });
  vi.spyOn(notifications, 'sendEmail').mockResolvedValue({ ok: true });
});
it('stores only a hash and notifies on the first successful browser login', async () => {
  const value = await service.recordLogin(user, '', '127.0.0.1', 'Test browser');
  expect(value).toMatch(/^[a-f0-9]{64}$/);
  expect(devices.record.mock.calls[0][0].deviceHash).not.toBe(value);
  expect(notifications.notifyInApp).toHaveBeenCalledWith(expect.objectContaining({ actionUrl: '/dashboard?settings=security' }));
  expect(notifications.sendEmail).toHaveBeenCalled();
});
it('recognizes a known cookie without duplicate alerts', async () => {
  devices.record.mockResolvedValue(false);
  const value = 'a'.repeat(64);
  expect(await service.recordLogin(user, `trace_device=${value}`)).toBe(value);
  expect(notifications.notifyInApp).not.toHaveBeenCalled();
});
it('never records a password-only OTP challenge', async () => {
  expect(await service.recordLogin(null)).toBeNull();
  expect(devices.record).not.toHaveBeenCalled();
});
it('does not fail login when storage or delivery fails', async () => {
  devices.record.mockRejectedValueOnce(new Error('DB unavailable'));
  expect(await service.recordLogin(user)).toBeNull();
  notifications.sendEmail.mockRejectedValue(new Error('SMTP unavailable'));
  expect(await service.recordLogin(user)).toMatch(/^[a-f0-9]{64}$/);
});
it('uses HttpOnly recognition cookies without granting authentication', () => {
  expect(service.COOKIE_OPTIONS).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/auth' });
});

it('permits HTTPS cross-origin recognition while keeping local HTTP cookies same-site', () => {
  expect(service.cookieOptionsFor('https://trace.example.test')).toMatchObject({ secure: true, sameSite: 'none', httpOnly: true });
  expect(service.cookieOptionsFor('http://localhost:5273')).toMatchObject({ secure: false, sameSite: 'lax', httpOnly: true });
});
