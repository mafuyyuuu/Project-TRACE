const model = require('../report.model');

it('returns every date-filtered staff workload row without paging the denominator', async () => {
  const rows = [60, 30, 10].map((documents_handled, id) => ({ id, documents_handled }));
  const executor = { query: vi.fn().mockResolvedValue([rows]) };
  await expect(model.workloadByClerk({ dateFrom: '2026-10-01', dateTo: '2026-10-05', page: 2, limit: 1 }, executor)).resolves.toEqual(rows);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain("u.role IN ('clerk', 'admin')");
  expect(sql).toContain('COUNT(DISTINCT sl.document_id) AS documents_handled');
  expect(sql).toContain('GROUP BY u.id');
  expect(sql).toContain('sl.timestamp_started >= ?');
  expect(sql).toContain('sl.timestamp_started < DATE_ADD(?, INTERVAL 1 DAY)');
  expect(sql).not.toMatch(/\bLIMIT\b|\bOFFSET\b/i);
  expect(params).toEqual(['2026-10-01', '2026-10-05']);
});
