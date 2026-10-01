const { migrate, table } = require('../migrate_onboarding_guides');
it('preserves existing guide state and does not enroll old accounts when rerun', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  expect(table).toMatch(/^CREATE TABLE IF NOT EXISTS onboarding_guides/);
  expect(table).toContain('user_id INT PRIMARY KEY');
  expect(table).toContain('shown_at TIMESTAMP NULL');
  expect(executor.query.mock.calls).toEqual([[table], [table]]);
  expect(table).not.toMatch(/INSERT|UPDATE|DELETE FROM|DROP|TRUNCATE/);
});
