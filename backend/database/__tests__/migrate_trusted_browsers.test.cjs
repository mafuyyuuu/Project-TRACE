const fs = require('fs');
const path = require('path');
const { migrate } = require('../migrate_trusted_browsers');
const { pool } = require('../../src/config/db');
const normalize = sql => sql.replace(/\s+/g, ' ').trim().replace(/;$/, '');

it('creates exactly the canonical trust table for existing databases', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  const canonical = schema.match(/CREATE TABLE IF NOT EXISTS trusted_browsers\s*\([\s\S]*?\) ENGINE=InnoDB;/)[0];
  expect(executor.query).toHaveBeenCalledOnce();
  expect(normalize(executor.query.mock.calls[0][0])).toBe(normalize(canonical));
});

it('reruns without modifying users, profile records or existing trust rows', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toMatch(/^CREATE TABLE IF NOT EXISTS trusted_browsers/);
    expect(sql).not.toMatch(/(?:^|;)\s*(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\b/i);
  }
});

it('propagates a database failure', async () => {
  const executor = { query: vi.fn().mockRejectedValue(new Error('Denied')) };
  await expect(migrate(executor)).rejects.toThrow('Denied');
});

it('never runs on import', () => {
  const query = vi.spyOn(pool, 'query');
  delete require.cache[require.resolve('../migrate_trusted_browsers')];
  require('../migrate_trusted_browsers');
  expect(query).not.toHaveBeenCalled();
});
