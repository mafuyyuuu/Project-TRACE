const { migrate, statements } = require('../migrate_templates');
it('adds only missing template keys and never rewrites saved layouts on rerun', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor); await migrate(executor);
  expect(statements[0]).toMatch(/^CREATE TABLE IF NOT EXISTS system_templates/);
  expect(statements[1]).toContain('INSERT IGNORE');
  expect(statements[1]).not.toMatch(/content|font_family|UPDATE|DELETE/);
  expect(executor.query.mock.calls.map(([sql]) => sql)).toEqual([...statements, ...statements]);
});
