const model = require('../../models/onboarding.model');
const { start } = require('../onboarding.controller');
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
