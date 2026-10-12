const model = require('../emailVerification.model');

it('issues one-hour verification links matching Profile guidance using the database clock', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) };
  await model.create(3, 'signup', 'synthetic@example.test', 'synthetic-hash', 2, executor);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain('DATE_ADD(NOW(), INTERVAL 1 HOUR)');
  expect(params).toEqual([3, 'signup', 'synthetic@example.test', 'synthetic-hash', 2]);
});

it('checks expiry and single-use state against the same database clock before lookup and consumption', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.lookup('synthetic-hash', executor);
  await model.consume(8, executor);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toContain('used_at IS NULL');
    expect(sql).toContain('expires_at > NOW()');
  }
  expect(executor.query.mock.calls[0][1]).toEqual(['synthetic-hash']);
  expect(executor.query.mock.calls[1][1]).toEqual([8]);
});
