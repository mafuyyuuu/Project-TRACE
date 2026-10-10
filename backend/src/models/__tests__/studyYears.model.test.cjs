const model = require('../studyYears.model');
it('parameterizes study-year writes separately from attendance and preserves the first confirmation timestamp', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await model.save(3, { year_started: 2020, graduation_year: 2024 }, executor);
  const [sql, params] = executor.query.mock.calls[0];
  expect(params).toEqual([3, 2020, 2024]);
  expect(sql).not.toContain('last_attendance_year');
  expect(sql).toContain('COALESCE(study_years_confirmed_at, CURRENT_TIMESTAMP)');
});
it('retains audit JSON values and reason as parameters', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  const before = { year_started: 2020, graduation_year: 2024 }, after = { year_started: 2019, graduation_year: 2024 };
  await model.record({ userId: 3, actorId: 9, kind: 'correction', before, after, reason: "Registrar's record" }, executor);
  expect(executor.query.mock.calls[0][1]).toEqual([3, 9, 'correction', JSON.stringify(before), JSON.stringify(after), "Registrar's record"]);
});
