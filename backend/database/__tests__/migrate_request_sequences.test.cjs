const { migrate } = require('../migrate_request_sequences');
it('creates counters explicitly and seeds conservatively without rewriting historical documents or originals', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  const sql = executor.query.mock.calls.map(([statement]) => statement);
  expect(sql[0]).toMatch(/^CREATE TABLE IF NOT EXISTS document_request_counters/);
  expect(sql[1]).toContain('MAX(CASE');
  expect(sql[1]).toContain('ON DUPLICATE KEY UPDATE last_number = GREATEST');
  expect(sql[1]).not.toContain('original_issued');
  expect(sql.every(statement => !/^(UPDATE|DELETE|DROP|TRUNCATE)\b/i.test(statement))).toBe(true);
  expect(sql.slice(2)).toEqual(sql.slice(0, 2));
});
