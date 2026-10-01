const { migrate } = require('../migrate_support_messages');
it('creates support explicitly without modifying existing records', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  expect(executor.query.mock.calls[0][0]).toMatch(/^CREATE TABLE IF NOT EXISTS support_messages/);
  expect(executor.query.mock.calls[0][0]).not.toMatch(/(?:^|;)\s*(?:UPDATE|DELETE|INSERT)\b/m);
});
