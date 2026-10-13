const { migrate, MIGRATION_KEY } = require('../migrate_request_catalog');
const { REQUEST_CATALOG } = require('../../src/utils/requestCatalog');
function fixture(applied = false) {
  const connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    query: vi.fn(async (sql, args) => {
      if (sql.startsWith('INSERT IGNORE INTO schema_migrations')) return [{ affectedRows: applied ? 0 : 1 }];
      if (sql.startsWith('SELECT id FROM document_types WHERE')) return [[{ id: REQUEST_CATALOG.findIndex(type => type.name === args[0]) + 1 }]];
      return [[]];
    }) };
  return { connection, query: vi.fn().mockResolvedValue([[]]), getConnection: vi.fn().mockResolvedValue(connection) };
}
it('replaces the new-request catalog transactionally without rewriting historical documents or receipts', async () => {
  const db = fixture();
  expect(await migrate(db)).toEqual({ applied: true, options: REQUEST_CATALOG.length });
  expect(db.connection.query).toHaveBeenCalledWith('INSERT IGNORE INTO schema_migrations (migration_key) VALUES (?)', [MIGRATION_KEY]);
  const inserts = db.connection.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO document_types'));
  expect(inserts).toHaveLength(REQUEST_CATALOG.length);
  expect(inserts.every(([sql, args]) => (sql.match(/\?/g) || []).length === args.length)).toBe(true);
  const sql = db.connection.query.mock.calls.map(([sql]) => sql).join('\n');
  expect(sql).not.toMatch(/(?:UPDATE|DELETE FROM|INSERT INTO) (?:documents|finance_|users)/);
  expect(db.connection.commit).toHaveBeenCalledOnce();
});
it('retains later Admin rate/activation changes on rerun', async () => {
  const db = fixture(true);
  expect(await migrate(db)).toEqual({ applied: false });
  expect(db.connection.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE document_types'))).toBe(false);
});
it('rolls back and leaves the catalog retryable if a component fee cannot be saved', async () => {
  const db = fixture(), original = db.connection.query.getMockImplementation();
  db.connection.query.mockImplementation(async (sql, args) => {
    if (sql.startsWith('INSERT INTO document_fee_schedules')) throw new Error('component write failed');
    return original(sql, args);
  });
  await expect(migrate(db)).rejects.toThrow('component write failed');
  expect(db.connection.rollback).toHaveBeenCalledOnce();
  expect(db.connection.commit).not.toHaveBeenCalled();
  expect(db.connection.release).toHaveBeenCalledOnce();
});
