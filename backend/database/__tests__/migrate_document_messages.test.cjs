const { migrate, table } = require('../migrate_document_messages');
it('creates only the missing conversation table without deleting or reseeding records', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  expect(table).toMatch(/^CREATE TABLE IF NOT EXISTS document_messages/);
  expect(table).toContain('INDEX idx_document_messages_doc');
  expect(table).toContain('read_at TIMESTAMP NULL');
  expect(executor.query.mock.calls).toEqual([[table], [table]]);
});
