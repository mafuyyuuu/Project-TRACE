const { migrate } = require('../migrate_program_catalog');
it('creates an empty catalog with college membership and duplicate protection; never seeds or rewrites profiles', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([{}]).mockResolvedValueOnce([[{ capacity: 100 }]]).mockResolvedValue([{}]) };
  await migrate(executor);
  const sql = executor.query.mock.calls.map(([query]) => query).join('\n');
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS programs');
  expect(sql).toContain('UNIQUE KEY programs_college_name (college_id, name)');
  expect(sql).toContain('REFERENCES colleges(id) ON DELETE RESTRICT');
  expect(sql).toContain('MODIFY COLUMN course VARCHAR(150)');
  expect(sql).not.toMatch(/^(INSERT|UPDATE|DELETE|DROP)\s/im);
});
it('reruns without shortening a larger course column or changing records', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([{}]).mockResolvedValueOnce([[{ capacity: 255 }]]) };
  await migrate(executor); expect(executor.query).toHaveBeenCalledTimes(2);
});
