const model = require('../onboarding.model');
it('lets only the first display claim succeed and does not reset shown accounts', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValue([{ affectedRows: 0 }]) };
  expect(await model.claim(3, executor)).toBe(true);
  expect(await model.claim(3, executor)).toBe(false);
  expect(executor.query.mock.calls[0]).toEqual([expect.stringContaining('WHERE user_id = ? AND shown_at IS NULL'), [3]]);
});
it('enrolls only the newly created account without resetting an existing display', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await model.enroll(3, executor);
  expect(executor.query).toHaveBeenCalledWith('INSERT IGNORE INTO onboarding_guides (user_id) VALUES (?)', [3]);
});
