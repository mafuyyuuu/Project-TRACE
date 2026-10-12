const model = require('../document.model');
it('retains identified ownership and requested type when OCR finishes after intake', async () => {
  const executor = {query:vi.fn().mockResolvedValue([{}])};
  await model.updateOcrData(9,{student_id:'EXTRACTED-OTHER',form_type:'Extracted type'},executor);
  const [sql]=executor.query.mock.calls[0];
  expect(sql).toContain("current_status = 'PENDING_W1_INTAKE' AND student_id IS NULL");
  expect(sql).toContain('ELSE student_id END');
  expect(sql).toContain('document_type = COALESCE(document_type, ?)');
});
it('declares the document alias in both paginated student history queries', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 0 }]]) };
  const conditions = ['d.student_id = ?', 'd.current_status = ?'];
  const params = ['STU-TEST', 'COMPLETED'];
  await expect(model.listWithFilters(conditions, params, 10, 20, executor)).resolves.toEqual([]);
  await expect(model.countWithFilters(conditions, params, executor)).resolves.toBe(0);
  const [listSql, listParams] = executor.query.mock.calls[0];
  expect(listSql).toContain("FROM documents d LEFT JOIN users student ON student.student_id = d.student_id AND student.role = 'student'");
  expect(listSql).toContain('LEFT JOIN users processor ON processor.id = d.assigned_clerk_id');
  expect(listSql).toContain('WHERE d.student_id = ? AND d.current_status = ? ORDER BY d.created_at DESC LIMIT ? OFFSET ?');
  expect(listParams).toEqual([...params, 10, 20]);
  expect(listSql).toContain('MAX(intake.timestamp_started)');
  expect(listSql).toContain("intake.to_status = 'PENDING_W1_INTAKE'");
  expect(listSql).toContain('intake.from_status IS NULL OR intake.from_status <> intake.to_status');
  expect(listSql).toContain('d.created_at)');
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
