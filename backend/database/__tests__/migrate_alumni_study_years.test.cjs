const { migrate } = require('../migrate_alumni_study_years');
it('adds nullable missing fields and audit tables without backfilling or rewriting request/profile history', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await migrate(executor);
  const statements = executor.query.mock.calls.map(([sql]) => sql);
  expect(statements.filter(sql => sql.startsWith('ALTER TABLE'))).toHaveLength(4);
  expect(statements).toContain('ALTER TABLE student_profiles ADD COLUMN year_started INT NULL');
  expect(statements.filter(sql => sql.startsWith('CREATE TABLE IF NOT EXISTS'))).toHaveLength(2);
  expect(statements.join('\n')).not.toMatch(/\b(?:DELETE|TRUNCATE|DROP|UPDATE|INSERT)\s+(?:INTO|TABLE|documents|student_profiles|users)/i);
});
it('can rerun on upgraded databases without adding duplicate columns', async () => {
  const columns = [['student_profiles', 'year_started'], ['student_profiles', 'study_years_confirmed_at'], ['users', 'registration_proof_unavailable'], ['users', 'registration_proof_reason']].map(([TABLE_NAME, COLUMN_NAME]) => ({ TABLE_NAME, COLUMN_NAME }));
  const executor = { query: vi.fn().mockResolvedValue([columns]) };
  await migrate(executor); await migrate(executor);
  expect(executor.query.mock.calls.some(([sql]) => sql.startsWith('ALTER TABLE'))).toBe(false);
});
