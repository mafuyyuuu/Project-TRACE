const model = require('../authenticator.model');
it('consumes recovery codes with an atomic single-use owner-bound update', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{ affectedRows: 0 }]) };
  expect(await model.consumeCode(3, 'hash', executor)).toBe(true);
  expect(await model.consumeCode(3, 'hash', executor)).toBe(false);
  expect(executor.query.mock.calls[0]).toEqual([expect.stringContaining('user_id = ? AND code_hash = ? AND used_at IS NULL'), [3, 'hash']]);
});
it('locks accounts before credential mutations and keeps hashes parameterized', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ id: 3 }]]) };
  await model.lockAccount(3, executor);
  expect(executor.query.mock.calls[0][0]).toContain('FOR UPDATE');
  await model.createChallenge({ userId: 3, hash: "x' OR 1=1", version: 2, expires: 9000 }, executor);
  expect(executor.query.mock.calls[2][0]).not.toContain("x' OR 1=1");
  expect(executor.query.mock.calls[2][1]).toEqual(["x' OR 1=1", 3, 2, 'authenticator', 9000]);
});
