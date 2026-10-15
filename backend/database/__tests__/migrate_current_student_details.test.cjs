const { migrate } = require('../migrate_current_student_details');
it('adds nullable current-student fields without changing any existing years or records', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await migrate(executor);
  const sql = executor.query.mock.calls.map(([query]) => query);
  expect(sql.slice(1)).toEqual(['ALTER TABLE student_profiles ADD COLUMN year_level VARCHAR(20) NULL', 'ALTER TABLE student_profiles ADD COLUMN section VARCHAR(20) NULL']);
  expect(sql.join('\n')).not.toMatch(/\b(?:UPDATE|DELETE|DROP|INSERT|TRUNCATE)\b/);
});
it('reruns without duplicate columns and adds only a missing column', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ COLUMN_NAME: 'year_level' }, { COLUMN_NAME: 'section' }]]) };
  await migrate(executor); await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);
  executor.query.mockReset().mockResolvedValue([[{ COLUMN_NAME: 'year_level' }]]);
  await migrate(executor);
  expect(executor.query.mock.calls[1][0]).toBe('ALTER TABLE student_profiles ADD COLUMN section VARCHAR(20) NULL');
});
