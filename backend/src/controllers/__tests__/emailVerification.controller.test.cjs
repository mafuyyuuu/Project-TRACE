const service = require('../../services/emailVerification.service');
const controller = require('../emailVerification.controller');
let req, res;
beforeEach(() => {
  req = { user: { id: 3 }, body: {} };
  res = { set: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  vi.spyOn(service, 'issue').mockResolvedValue({ email_sent: true });
});
it('resends the signed-in account link without trusting a body account ID', async () => {
  req.body = { user_id: 9, token_version: 100 };
  await controller.resend(req, res);
  expect(service.issue).toHaveBeenCalledWith(3, {});
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
});
it('passes only email/password for a changed address to the existing verified-change service', async () => {
  req.body = { email: 'new@example.test', current_password: 'synthetic', user_id: 9, email_verified_at: 'forged' };
  await controller.resend(req, res);
  expect(service.issue).toHaveBeenCalledWith(3, { email: 'new@example.test', current_password: 'synthetic' });
});
it.each([401, 429])('keeps credential and resend restrictions: %s', async status => {
  service.issue.mockRejectedValue(Object.assign(new Error('Denied'), { status }));
  await controller.resend(req, res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({ error: 'Denied' });
});
