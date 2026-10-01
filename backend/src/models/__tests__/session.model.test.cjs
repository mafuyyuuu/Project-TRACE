const sessions = require('../session.model');
it('stores a hash and actual expiry without persisting the bearer token', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  const hash = sessions.hashToken('private.jwt.value');
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  await sessions.revoke(3, hash, 1800000000, executor);
  expect(executor.query).toHaveBeenCalledWith(expect.stringContaining('ON DUPLICATE KEY'), [3, hash, 1800000000]);
  expect(JSON.stringify(executor.query.mock.calls)).not.toContain('private.jwt.value');
});
it('only considers unexpired revocations', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  expect(await sessions.revoked('a'.repeat(64), executor)).toBe(false);
  expect(executor.query).toHaveBeenCalledWith(expect.stringContaining('expires_at > CURRENT_TIMESTAMP'), ['a'.repeat(64)]);
  executor.query.mockResolvedValue([[{ token_hash: 'a'.repeat(64) }]]);
  expect(await sessions.revoked('a'.repeat(64), executor)).toBe(true);
});
