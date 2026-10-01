const { migrate } = require('../migrate_email_verification');
it('adds nullable verification and hashed expiring links without fabricating proof for existing accounts', async () => {
  const executor = { query: vi.fn(async sql => sql.startsWith('SELECT') ? [[]] : [{}]) };
  await migrate(executor);
  const sql = executor.query.mock.calls.map(call => call[0]).join('\n');
  expect(sql).toContain('email_verified_at DATETIME NULL');
  expect(sql).toContain('token_hash CHAR(64) NOT NULL UNIQUE');
  expect(sql).not.toMatch(/UPDATE users|DROP|TRUNCATE/);
});
it('reruns without adding the column again and propagates permissions errors', async () => {
  const executor = { query: vi.fn(async sql => sql.startsWith('SELECT') ? [[{ COLUMN_NAME: 'email_verified_at' }]] : [{}]) };
  await migrate(executor); expect(executor.query.mock.calls.some(([sql]) => sql.startsWith('ALTER'))).toBe(false);
  executor.query.mockRejectedValue(new Error('Denied'));
  await expect(migrate(executor)).rejects.toThrow('Denied');
});
