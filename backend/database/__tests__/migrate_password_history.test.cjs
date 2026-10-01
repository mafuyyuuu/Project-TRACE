const fs = require('fs');
const path = require('path');
const { pool } = require('../../src/config/db');
const { migrate, statement } = require('../migrate_password_history');

it('creates only the canonical password-history table, retaining the account foreign key', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  expect(executor.query).toHaveBeenCalledOnce();
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const definition = schema.match(/CREATE TABLE IF NOT EXISTS password_history \([\s\S]*?\n\);/)[0];
  expect(statement.replace(' ENGINE=InnoDB', '') + ';').toBe(definition);
});

it('can repeat without rewriting passwords or inventing past history', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  await migrate(executor);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toMatch(/^CREATE TABLE IF NOT EXISTS password_history/);
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|ALTER|DROP|TRUNCATE)\b/i);
    expect(sql).toContain('id INT AUTO_INCREMENT PRIMARY KEY');
  }
});

it('propagates database failures so rollout cannot claim completion', async () => {
  const error = new Error('permission denied');
  await expect(migrate({ query: vi.fn().mockRejectedValue(error) })).rejects.toBe(error);
});

it('does not query or close the database when imported', () => {
  const query = vi.spyOn(pool, 'query');
  const end = vi.spyOn(pool, 'end');
  delete require.cache[require.resolve('../migrate_password_history')];
  require('../migrate_password_history');
  expect(query).not.toHaveBeenCalled();
  expect(end).not.toHaveBeenCalled();
});
