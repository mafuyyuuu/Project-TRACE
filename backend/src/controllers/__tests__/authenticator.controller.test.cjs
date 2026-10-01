const service = require('../../services/authenticator.service');
const controller = require('../authenticator.controller');
let req, res;
beforeEach(() => {
  req = { user: { id: 3, token_version: 2 }, body: { current_password: 'synthetic' } };
  res = { set: vi.fn(), clearCookie: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
});
it('uses the authenticated account and prevents enrollment response caching', async () => {
  vi.spyOn(service, 'begin').mockResolvedValue({ secret: 'synthetic-secret' });
  req.body.user_id = 99;
  await controller.begin(req, res);
  expect(service.begin).toHaveBeenCalledWith(req.user, req.body);
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
});
it('clears browser trust after committed activation only', async () => {
  vi.spyOn(service, 'confirm').mockResolvedValue({ token: 'new-session', recovery_codes: ['synthetic'] });
  await controller.confirm(req, res);
  expect(res.clearCookie).toHaveBeenCalledOnce();
  service.confirm.mockRejectedValue(Object.assign(new Error('Invalid code'), { status: 400 }));
  res.clearCookie.mockClear();
  await controller.confirm(req, res);
  expect(res.clearCookie).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(400);
});
it('returns safe errors without serializing unexpected secret-bearing failures', async () => {
  vi.spyOn(service, 'status').mockRejectedValue(new Error('SECRET=synthetic'));
  await controller.status(req, res);
  expect(JSON.stringify(res.json.mock.calls)).not.toContain('SECRET');
});
