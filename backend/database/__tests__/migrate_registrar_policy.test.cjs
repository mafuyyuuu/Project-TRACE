const { migrate } = require('../migrate_registrar_policy');
const attachments = require('../migrate_request_attachments');
it('adds a safe eligibility flag without changing historic requests or activating drafts', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await migrate(executor);
  const queries = executor.query.mock.calls;
  expect(queries.some(([sql]) => sql.includes('ALTER TABLE documents ADD COLUMN is_same_day BOOLEAN NOT NULL DEFAULT FALSE'))).toBe(true);
  expect(queries.filter(([sql]) => sql.startsWith('UPDATE document_types SET is_walk_in')).map(([, args]) => args[0])).toEqual(['CTC', '2nd Copy of COR', '2nd Copy of OGR', 'CAV']);
  expect(queries.map(([sql]) => sql).join('\n')).not.toMatch(/UPDATE documents |SET is_active|DROP|DELETE/);
});
it('does not add the column again on repeated migration', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ COLUMN_NAME: 'is_same_day' }]]) };
  await migrate(executor);
  expect(executor.query.mock.calls.some(([sql]) => sql.startsWith('ALTER'))).toBe(false);
});
it('creates idempotent attachment tables with ownership and preserved upload history', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await attachments.migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);
  expect(attachments.statements.join('\n')).toContain('uploaded_by');
  expect(attachments.statements.every(sql => sql.startsWith('CREATE TABLE IF NOT EXISTS'))).toBe(true);
  expect(attachments.statements.join('\n')).not.toMatch(/DROP TABLE|DELETE FROM/);
});
