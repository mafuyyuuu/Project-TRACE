const { migrate } = require('../migrate_8b');
const fs = require('fs');
const path = require('path');

it('backfills exact matches and creates inactive fee drafts without overwriting existing types', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await migrate(executor);
  const sql = executor.query.mock.calls.map(call => call[0]).join('\n');
  expect(sql).toContain('BINARY u.course = BINARY c.name');
  expect(sql).toContain('WHERE u.college_id IS NULL');
  expect(sql).toContain('SELECT ?, 0, FALSE, TRUE, FALSE WHERE NOT EXISTS');
  expect(executor.query.mock.calls.filter(call => call[0].includes('SELECT ?, 0')).map(call => call[1][0])).toEqual(['CTC', '2nd Copy of COR', '2nd Copy of OGR', 'CAV']);
  expect(sql).not.toMatch(/DROP|DELETE FROM/);
});
it('accepts duplicate columns and an existing FK, but propagates deployment errors', async () => {
  const executor = { query: vi.fn(async sql => {
    if (sql.includes('ADD COLUMN')) throw Object.assign(new Error('exists'), { code: 'ER_DUP_FIELDNAME' });
    return sql.includes('information_schema') ? [[{ CONSTRAINT_NAME: 'existing' }]] : [[]];
  }) };
  await expect(migrate(executor)).resolves.toBeUndefined();
  expect(executor.query.mock.calls.some(call => call[0].includes('ADD CONSTRAINT'))).toBe(false);
  executor.query.mockRejectedValue(new Error('permission denied'));
  await expect(migrate(executor)).rejects.toThrow('permission denied');
});
it('fresh schema creates colleges before the users FK and defines policies on document_types', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  expect(sql.indexOf('CREATE TABLE IF NOT EXISTS colleges')).toBeLessThan(sql.indexOf('CREATE TABLE IF NOT EXISTS users'));
  const colleges = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS colleges'), sql.indexOf('-- Users table:'));
  expect(colleges).not.toContain('available_to');
  expect(sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS document_types'))).toContain('is_repeatable');
});
