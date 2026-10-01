const model = require('../finance.model');
it('groups payments once and uses the same Manila epoch filters for list and total', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[{ total: 0, amount: 0 }]]).mockResolvedValueOnce([[]]) };
  const filter = { from: '2026-10-01', to: '2026-10-01', receipt: 'pending' };
  await model.summary(filter, executor); await model.list(filter, 25, 0, executor);
  const expected = [Date.parse('2026-10-01T00:00:00+08:00') / 1000, Date.parse('2026-10-02T00:00:00+08:00') / 1000];
  expect(executor.query.mock.calls[0][1]).toEqual(expected);
  expect(executor.query.mock.calls[1][1]).toEqual([...expected, 25, 0]);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toContain("payment_status = 'PAID'");
    expect(sql).toContain('GROUP BY COALESCE(d.request_group_id, d.tracking_number)');
    expect(sql).toContain('SUM(d.amount)');
    expect(sql).toContain('or_number IS NULL');
  }
});
