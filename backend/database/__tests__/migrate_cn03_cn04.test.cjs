const fs = require('fs');
const path = require('path');
const { migrate, MIGRATION_KEY } = require('../migrate_cn03_cn04');
const { pool } = require('../../src/config/db');

function fixture() {
  const state = { applied: false, types: [
    { name: 'Certificate of Good Moral', is_active: true, base_fee: 50 },
    { name: 'Certificate of Good Moral Character', is_active: true, base_fee: 50 },
    { name: 'Good Moral Certificate', is_active: true, base_fee: 50 },
    { name: 'Diploma', is_active: true, base_fee: 50 },
    { name: 'Transcript of Records', is_active: true, base_fee: 100 },
  ] };
  let snapshot;
  const connection = {
    beginTransaction: vi.fn(async () => { snapshot = JSON.parse(JSON.stringify(state)); }),
    commit: vi.fn(async () => { snapshot = null; }),
    rollback: vi.fn(async () => { if (snapshot) Object.assign(state, snapshot); snapshot = null; }),
    release: vi.fn(),
    query: vi.fn(async (sql, values) => {
      if (sql.includes('INSERT IGNORE')) {
        const affectedRows = state.applied ? 0 : 1;
        state.applied = true;
        return [{ affectedRows }];
      }
      if (sql.includes('SET is_active')) {
        state.types.forEach(row => { if (values.includes(row.name.toLowerCase())) row.is_active = false; });
      }
      if (sql.includes('SET base_fee')) {
        state.types.forEach(row => { if (row.name === values[1] && row.base_fee === values[2]) row.base_fee = values[0]; });
      }
      return [{ affectedRows: 1 }];
    }),
  };
  return { state, connection, database: { getConnection: vi.fn().mockResolvedValue(connection) } };
}

it('retires all known names and changes only the old Diploma default', async () => {
  const { state, connection, database } = fixture();
  const custom = { name: 'Diploma', is_active: true, base_fee: 325 };
  state.types.push(custom);
  await expect(migrate(database)).resolves.toEqual({ applied: true });
  expect(state.types.slice(0, 3).every(row => !row.is_active)).toBe(true);
  expect(state.types[3].base_fee).toBe(250);
  expect(state.types[4].base_fee).toBe(100);
  expect(custom.base_fee).toBe(325);
  const sql = connection.query.mock.calls.map(call => call[0]).join('\n');
  expect(sql).not.toMatch(/UPDATE documents|DELETE|DROP/i);
  expect(connection.commit).toHaveBeenCalledOnce();
  expect(connection.release).toHaveBeenCalledOnce();
});

it('preserves a later Admin fee of 50 on rerun', async () => {
  const { state, connection, database } = fixture();
  await migrate(database);
  state.types[3].base_fee = 50;
  connection.query.mockClear();
  await expect(migrate(database)).resolves.toEqual({ applied: false });
  expect(state.types[3].base_fee).toBe(50);
  expect(connection.query.mock.calls.some(call => call[0].includes('UPDATE'))).toBe(false);
  expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('INSERT IGNORE'), [MIGRATION_KEY]);
});

it('rolls back both marker and updates on failure and allows a successful retry', async () => {
  const { state, connection, database } = fixture();
  const query = connection.query.getMockImplementation();
  connection.query.mockImplementation(async (sql, values) => {
    if (sql.includes('SET base_fee')) throw new Error('update denied');
    return query(sql, values);
  });
  await expect(migrate(database)).rejects.toThrow('update denied');
  expect(state.applied).toBe(false);
  expect(state.types[0].is_active).toBe(true);
  expect(connection.release).toHaveBeenCalledOnce();
  connection.query.mockImplementation(query);
  await expect(migrate(database)).resolves.toEqual({ applied: true });
});

it('does not open a database connection when imported', () => {
  const acquire = vi.spyOn(pool, 'getConnection');
  delete require.cache[require.resolve('../migrate_cn03_cn04')];
  require('../migrate_cn03_cn04');
  expect(acquire).not.toHaveBeenCalled();
});

it('aligns the fresh seed and protects Diploma fees on full migration reruns', () => {
  const source = fs.readFileSync(path.join(__dirname, '../migration.js'), 'utf8');
  const start = source.indexOf('const DOCUMENT_TYPES =');
  const seed = source.slice(start, source.indexOf('for (const [i, [name', start));
  expect(seed).not.toMatch(/Good Moral/);
  expect(seed).toContain("['Diploma', 250.0");
  expect(source).toContain("base_fee = IF(name = 'Diploma', base_fee, VALUES(base_fee))");
  expect(source).toContain("require('./migrate_cn03_cn04').migrate(pool)");
  const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  expect(schema).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
});
