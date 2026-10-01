const { migrate } = require('../migrate_finance_receipts');
it('adds only missing nullable columns and leaves historical dates untouched', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await migrate(executor);
  const ddl = executor.query.mock.calls.filter(([sql]) => sql.startsWith('ALTER'));
  expect(ddl).toHaveLength(3);
  expect(ddl.map(([sql]) => sql).join('\n')).not.toMatch(/UPDATE|DROP|NOT NULL/);
});
it('does nothing when the columns already exist', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ COLUMN_NAME: 'exists' }]]) };
  await migrate(executor);
  expect(executor.query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
});
