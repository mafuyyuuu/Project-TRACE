const { migrate } = require('../migrate_sessions');
it('is explicit, preserves account data, and safely repeats', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);
  const sql = executor.query.mock.calls[0][0];
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS session_revocations');
  expect(sql).not.toMatch(/UPDATE users|DELETE FROM|TRUNCATE|DROP TABLE/);
});
