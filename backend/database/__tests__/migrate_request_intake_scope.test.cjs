const { migrate } = require('../migrate_request_intake_scope');
it('adds only missing columns and never rewrites historical routing or requirements', async () => {
  const tx = { query: vi.fn().mockResolvedValue([[]]) };
  await migrate(tx);
  const sql = tx.query.mock.calls.map(([sql]) => sql);
  expect(sql.filter(sql => sql.startsWith('ALTER TABLE'))).toHaveLength(3);
  expect(sql.some(sql => /UPDATE|DELETE|INSERT/.test(sql))).toBe(false);
  tx.query.mockReset().mockResolvedValue([[{TABLE_NAME:'documents',COLUMN_NAME:'routing_college_id'},{TABLE_NAME:'documents',COLUMN_NAME:'routing_college_name'},{TABLE_NAME:'request_attachment_requirements',COLUMN_NAME:'blocks_intake'}]]);
  await migrate(tx);
  expect(tx.query).toHaveBeenCalledOnce();
});
