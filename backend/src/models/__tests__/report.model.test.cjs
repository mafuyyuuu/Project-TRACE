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

it('uses the same parameterized college and cleared-status filters for lists, counts, summaries and exports', async () => {
  const filters = { collegeId: 4, collegeName: 'College Four', statuses: ['READY_FOR_RELEASE', 'COMPLETED'], dateFrom: '2026-10-01', paymentStatus: 'PAID' };
  const { where, params } = model.buildDocumentFilters(filters);
  expect(where).toContain('d.current_status IN (?, ?)');
  expect(where).toContain("student.role = 'student'");
  expect(where).toContain('COALESCE(d.routing_college_id');
  expect(where).toContain('COUNT(*) = 1');
  expect(where).toContain('colleges WHERE is_active = TRUE AND id = ?');
  expect(params).toEqual(['2026-10-01', 'READY_FOR_RELEASE', 'COMPLETED', 'PAID', 4]);
  const executor = { query: vi.fn().mockResolvedValue([[{ total: 0 }]]) };
  await model.listDocumentsForReport(filters, { limit: 25, offset: 25 }, executor);
  await model.countDocumentsForReport(filters, executor);
  await model.summariseDocuments(filters, executor);
  await model.groupDocumentsBy('current_status', filters, executor);
  executor.query.mock.calls.forEach(([sql, values], index) => {
    expect(sql).toContain(where);
    expect(values).toEqual(index === 0 ? [...params, 25, 25] : params);
  });
  expect(executor.query.mock.calls[0][0]).toContain('d.document_sequence_number');
  expect(executor.query.mock.calls[0][0]).toContain('ORDER BY d.created_at DESC');
});

it('scopes legacy college names and student category exports without changing their category', async () => {
  const filters = { collegeName: 'Legacy College' };
  expect(model.buildDocumentFilters(filters).params).toEqual(['Legacy College']);
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.listStudentsForExport('alumni', executor, filters);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain("u.enrollment_status = 'graduated'");
  expect(sql).toContain('AND u.course = ?');
  expect(params).toEqual(['Legacy College']);
});
