const { migrate, table } = require('../migrate_staff_authenticator_setup');
it('preserves existing grants on rerun without allocating codes or granting sessions', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  expect(table).toMatch(/^CREATE TABLE IF NOT EXISTS staff_authenticator_setup/);
  expect(table).toContain('code_hash CHAR(64)');
  expect(executor.query.mock.calls).toEqual([[table], [table]]);
});
