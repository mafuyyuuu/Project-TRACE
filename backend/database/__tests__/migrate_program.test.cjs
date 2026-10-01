const { migrate } = require('../migrate_program');
it('adds only a nullable program without inferring it from college or changing records', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockResolvedValue([{}]) };
  await migrate(executor);
  expect(executor.query.mock.calls[1][0]).toBe('ALTER TABLE users ADD COLUMN program VARCHAR(150) NULL');
  expect(executor.query.mock.calls).toHaveLength(2);
});
it('preserves an existing program column and data on rerun', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ COLUMN_NAME: 'program' }]]) };
  await migrate(executor); expect(executor.query).toHaveBeenCalledOnce();
});
