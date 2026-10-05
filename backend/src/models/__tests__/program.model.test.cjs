const model = require('../program.model');
it('exposes only programs and colleges that are active to profile readers', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.list({}, executor);
  expect(executor.query.mock.calls[0][0]).toContain('p.is_active = TRUE AND c.is_active = TRUE');
  await model.list({ includeInactive: true }, executor);
  expect(executor.query.mock.calls[1][0]).not.toContain('WHERE');
});
it('binds both college membership and name in the same locked query', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ id: 1 }]]) };
  await model.findByName(3, "O'Reilly Program", executor, true);
  expect(executor.query).toHaveBeenCalledWith(expect.stringContaining('WHERE college_id = ? AND name = ? FOR UPDATE'), [3, "O'Reilly Program"]);
});
