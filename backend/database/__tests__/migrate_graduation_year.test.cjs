const { migrate } = require('../migrate_graduation_year');
it('adds a nullable graduation year without copying attendance or rewriting records', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockResolvedValue([{}]) };
  await migrate(executor);
  expect(executor.query.mock.calls[0][1]).toEqual(['student_profiles', 'graduation_year']);
  expect(executor.query.mock.calls[1][0]).toBe('ALTER TABLE student_profiles ADD COLUMN graduation_year INT NULL');
  expect(executor.query.mock.calls).toHaveLength(2);
});
it('leaves existing graduation and attendance records unchanged on rerun', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ COLUMN_NAME: 'graduation_year' }]]) };
  await migrate(executor);
  expect(executor.query).toHaveBeenCalledOnce();
});
