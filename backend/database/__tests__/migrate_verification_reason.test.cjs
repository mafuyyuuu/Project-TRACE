const { migrate } = require('../migrate_verification_reason');
it('adds a nullable reason without changing accounts or inventing historical findings', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockResolvedValue([{}]) };
  await migrate(executor);
  expect(executor.query.mock.calls).toHaveLength(2);
  expect(executor.query.mock.calls[0][1]).toEqual(['users', 'verification_reason']);
  expect(executor.query.mock.calls[1][0]).toBe('ALTER TABLE users ADD COLUMN verification_reason VARCHAR(300) NULL');
});
it('preserves recorded reasons when rerun', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ COLUMN_NAME: 'verification_reason' }]]) };
  await migrate(executor);
  expect(executor.query).toHaveBeenCalledOnce();
});
