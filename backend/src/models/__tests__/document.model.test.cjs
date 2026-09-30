const model = require('../document.model');
it('declares the document alias in both paginated student history queries', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 0 }]]) };
  const conditions = ['d.student_id = ?', 'd.current_status = ?'];
  const params = ['STU-TEST', 'COMPLETED'];
  await expect(model.listWithFilters(conditions, params, 10, 20, executor)).resolves.toEqual([]);
  await expect(model.countWithFilters(conditions, params, executor)).resolves.toBe(0);
  expect(executor.query.mock.calls[0]).toEqual([
    'SELECT d.* FROM documents d WHERE d.student_id = ? AND d.current_status = ? ORDER BY d.created_at DESC LIMIT ? OFFSET ?',
    [...params, 10, 20],
  ]);
  expect(executor.query.mock.calls[1]).toEqual([
    'SELECT COUNT(*) as total FROM documents d WHERE d.student_id = ? AND d.current_status = ?', params,
  ]);
});
it('persists estimate and rates in the same insert without trusting raw SQL values', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{ insertId: 1 }]) };
  const pricing_snapshot = { base_fee: 50 }, fee_breakdown = { total: 50 };
  await model.insert({ tracking_number: 'TRC-TEST', pricing_snapshot, fee_breakdown }, executor);
  const [sql, values] = executor.query.mock.calls[0];
  expect((sql.match(/\?/g) || []).length).toBe(values.length);
  expect(values.slice(-2)).toEqual([JSON.stringify(pricing_snapshot), JSON.stringify(fee_breakdown)]);
});
it('atomically writes final amount, calculation and author', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await model.updatePricing(1, { amount: 100, pageCount: 2, pricingNotes: 'basis', clerkId: 3, pricingSnapshot: { base_fee: 50 }, feeBreakdown: { total: 100 } }, executor);
  expect(executor.query).toHaveBeenCalledOnce();
  expect(executor.query.mock.calls[0][0]).toContain('pricing_snapshot = ?, fee_breakdown = ?');
  expect(executor.query.mock.calls[0][1]).toEqual([100, 2, 'basis', 3, '{"base_fee":50}', '{"total":100}', 1]);
});
it('decodes string JSON on locked reads', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ id: 1, pricing_snapshot: '{"base_fee":50}', fee_breakdown: '{"total":50}' }]]) };
  const [row] = await model.findByIdForUpdate(1, executor);
  expect(row.pricing_schedule).toEqual({ base_fee: 50 });
  expect(row.fee_breakdown).toEqual({ total: 50 });
});
it('invalidates obsolete snapshots when evaluation corrects identity or type', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await model.updateEvaluation(1, 'SEC_PROCESSING', 'STU-NEW', 'Name', 'New Type', null, executor);
  const [sql, values] = executor.query.mock.calls[0];
  expect(sql).toContain('THEN pricing_snapshot ELSE NULL END');
  expect(values.slice(0, 4)).toEqual(['STU-NEW', 'New Type', 'STU-NEW', 'New Type']);
  expect((sql.match(/\?/g) || []).length).toBe(values.length);
});
