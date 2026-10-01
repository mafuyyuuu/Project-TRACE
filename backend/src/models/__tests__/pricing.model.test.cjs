const model = require('../pricing.model');
it('loads default items and college schedules together with bound IDs', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[
    { document_type_id: 7, college_id: null, fee_items: '[{"label":"Certification","amount":5}]' },
    { document_type_id: 7, college_id: 2, base_fee: '10.00', fee_rule: 'flat', fee_items: [] },
  ]]) };
  const [row] = await model.attachSchedules([{ id: 7, name: 'Test' }], executor);
  expect(row.fee_items).toEqual([{ label: 'Certification', amount: 5 }]);
  expect(row.college_fee_schedules).toHaveLength(1);
  expect(executor.query.mock.calls[0][1]).toEqual([7]);
});
it('replaces each schedule under a parent lock using the transaction executor', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.saveSchedules(7, { fee_items: [], college_fee_schedules: [{ college_id: 2, base_fee: 10, fee_rule: 'flat', rental_fee: 0, special_fee: 0, fee_items: [] }] }, executor);
  expect(executor.query.mock.calls[0]).toEqual(['SELECT id FROM document_types WHERE id = ? FOR UPDATE', [7]]);
  const [sql, values] = executor.query.mock.calls.at(-1);
  expect((sql.match(/\?/g) || []).length).toBe(values.length);
  expect(values).toEqual([7, 2, 10, 'flat', 0, 0, '[]']);
});
it('propagates schedule failures to the enclosing transaction', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockRejectedValueOnce(new Error('failed')) };
  await expect(model.saveSchedules(7, { fee_items: [] }, executor)).rejects.toThrow('failed');
});
it('never rebuilds already priced bills using current rates', async () => {
  const executor = { query: vi.fn() };
  const docs = [{ id: 1, priced_at: '2026-01-01', amount: 75 }];
  expect(await model.enrichDocuments(docs, executor)).toBe(docs);
  expect(executor.query).not.toHaveBeenCalled();
});
it('prepares current rates only for an unpriced legacy document, with explicit review', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[{ id: 7, document_id: 1, name: 'Test', base_fee: 50, fee_rule: 'flat', pricing_college_id: 2 }]])
    .mockResolvedValueOnce([[{ document_type_id: 7, college_id: 2, base_fee: 80, fee_rule: 'flat', fee_items: [] }]]) };
  const rows = await model.enrichDocuments([{ id: 1, document_type: 'Test' }, { id: 2, priced_at: '2026-01-01', amount: 100 }], executor);
  expect(rows[0]).toMatchObject({ pricing_requires_review: true, pricing_schedule: { base_fee: 80, source: 'college' } });
  expect(rows[1]).toEqual({ id: 2, priced_at: '2026-01-01', amount: 100 });
});
