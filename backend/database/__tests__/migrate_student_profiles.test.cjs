const fs = require('fs');
const path = require('path');
const { migrate } = require('../migrate_student_profiles');
const { pool } = require('../../src/config/db');

const normalize = sql => sql.replace(/\s+/g, ' ').trim().replace(/;$/, '');

it('creates the missing profile table using the canonical base schema', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  const definition = schema.match(/CREATE TABLE IF NOT EXISTS student_profiles\s*\([\s\S]*?\);/)[0];
  expect(executor.query).toHaveBeenCalledOnce();
  expect(normalize(executor.query.mock.calls[0][0])).toBe(normalize(definition));
});

it('reruns only conditional table creation without altering tables or rewriting records', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toMatch(/^CREATE TABLE IF NOT EXISTS student_profiles/);
    expect(sql).not.toMatch(/(?:^|;)\s*(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\b/i);
  }
});

it('propagates database errors instead of claiming a successful repair', async () => {
  const error = Object.assign(new Error('table creation denied'), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
  const executor = { query: vi.fn().mockRejectedValue(error) };
  await expect(migrate(executor)).rejects.toBe(error);
});

it('does not query the database when imported', () => {
  const query = vi.spyOn(pool, 'query');
  delete require.cache[require.resolve('../migrate_student_profiles')];
  require('../migrate_student_profiles');
  expect(query).not.toHaveBeenCalled();
});
