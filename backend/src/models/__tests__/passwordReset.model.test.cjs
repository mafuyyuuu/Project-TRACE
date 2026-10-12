const model = require('../passwordReset.model');

it('excludes expired and previously consumed reset hashes using the database clock', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await expect(model.findUsableByTokenHash('synthetic-hash', executor)).resolves.toEqual([]);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain('pr.token_hash = ?');
  expect(sql).toContain('pr.used_at IS NULL');
  expect(sql).toContain('pr.expires_at > NOW()');
  expect(params).toEqual(['synthetic-hash']);
});
