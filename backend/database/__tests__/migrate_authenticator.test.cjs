const { migrate } = require('../migrate_authenticator');
it('creates tables explicitly without modifying accounts or existing records on rerun', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(6);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toMatch(/^CREATE TABLE IF NOT EXISTS/);
    expect(sql).toContain('ENGINE=InnoDB');
    expect(sql).not.toMatch(/ALTER|UPDATE|DROP|TRUNCATE/);
  }
});
it('stops and surfaces failed schema creation', async () => {
  const executor = { query: vi.fn().mockRejectedValue(new Error('DDL denied')) };
  await expect(migrate(executor)).rejects.toThrow('DDL denied');
  expect(executor.query).toHaveBeenCalledOnce();
});
