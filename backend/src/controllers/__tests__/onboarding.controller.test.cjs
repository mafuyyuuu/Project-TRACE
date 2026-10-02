const model = require('../../models/onboarding.model');
const { start } = require('../onboarding.controller');
it.each(['clerk', 'admin'])('enrolls %s once without resetting a previous display or using a body identity', async role => {
  vi.spyOn(model, 'enroll').mockResolvedValue([{}]);
  vi.spyOn(model, 'claim').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const res = { set: vi.fn().mockReturnThis(), json: vi.fn() };
  const req = { user: { id: 7, role }, body: { user_id: 9 } };
  await start(req, res); await start(req, res);
  expect(model.enroll).toHaveBeenNthCalledWith(1, 7);
  expect(model.claim).toHaveBeenNthCalledWith(1, 7);
  expect(res.json).toHaveBeenNthCalledWith(1, { show_guide: true });
  expect(res.json).toHaveBeenNthCalledWith(2, { show_guide: false });
});
it('claims only the authenticated account, ignoring caller-supplied identities', async () => {
  vi.spyOn(model, 'claim').mockResolvedValue(true);
  const res = { set: vi.fn().mockReturnThis(), json: vi.fn() };
  await start({ user: { id: 3 }, body: { user_id: 9 } }, res);
  expect(model.claim).toHaveBeenCalledExactlyOnceWith(3);
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(res.json).toHaveBeenCalledWith({ show_guide: true });
});
it('does not expose database error details', async () => {
  vi.spyOn(model, 'claim').mockRejectedValue(new Error('private SQL'));
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await start({ user: { id: 3 } }, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json.mock.calls[0][0].error).not.toContain('private SQL');
});
