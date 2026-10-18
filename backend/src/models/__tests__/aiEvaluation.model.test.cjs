const model = require('../aiEvaluation.model');
it('aggregates document rows in Manila days using exclusive epoch bounds and a fixed cohort', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.daily(100, 200, 'synthetic', executor);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toContain('FROM documents'); expect(sql).not.toContain('step_logs');
  expect(sql).toContain('(UNIX_TIMESTAMP(created_at)+28800)/86400');
  expect(sql).toContain('UNIX_TIMESTAMP(created_at) < ?');
  expect(sql).toContain("tracking_number LIKE 'TRC-MOCK-%'");
  expect(params).toEqual([100, 200]);
});
it('keeps unmarked provenance distinct and counts saved OCR samples', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ total: 43 }]]) };
  await model.summary('unmarked', executor);
  expect(executor.query.mock.calls[0][0]).toContain("NOT (tracking_number LIKE 'TRC-MOCK-%')");
  expect(executor.query.mock.calls[0][0]).toContain('COUNT(ocr_confidence_score)');
});
