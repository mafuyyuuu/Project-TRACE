const model = require('../requestSequence.model');

function ledger(last_number = 0, original_issued = false) {
  const row = { last_number, original_issued };
  const executor = { query: vi.fn(async (sql, params) => {
    if (sql.startsWith('SELECT')) return [[{ ...row }]];
    if (sql.includes('SET last_number')) row.last_number = params[0];
    if (sql.includes('SET original_issued')) row.original_issued = true;
    return [{ affectedRows: 1 }];
  }) };
  return { executor, row };
}

it('locks the durable ledger and never counts surviving documents to allocate the next number', async () => {
  const { executor } = ledger();
  expect(await model.allocate('STU-001', 'TOR', executor)).toBe('TOR – Request No. 1');
  // Removing a request does not remove its counter. The next allocation uses the ledger.
  expect(await model.allocate('STU-001', 'TOR', executor)).toBe('TOR – Request No. 2');
  expect(executor.query.mock.calls[1]).toEqual([expect.stringContaining('FOR UPDATE'), ['STU-001', 'TOR']]);
  expect(executor.query.mock.calls.every(([sql]) => !sql.includes('COUNT(') && !sql.includes('DELETE'))).toBe(true);
});
it('reserves the original slot only with an explicit issuance record', async () => {
  const { executor } = ledger();
  expect(await model.recordOriginal('STU-001', 'Diploma', 6, 'Checked issuance register.', executor)).toBe(true);
  expect(await model.allocate('STU-001', 'Diploma', executor)).toBe('Diploma – Request No. 2');
  expect(await model.recordOriginal('STU-001', 'Diploma', 9, 'Other note', executor)).toBe(false);
  expect(executor.query.mock.calls.filter(([sql]) => sql.includes('SET original_issued'))).toHaveLength(1);
});
it('preserves a larger historical maximum and keeps identifiers bound as parameters', async () => {
  const { executor } = ledger(12, true);
  expect(await model.allocate("STU'01", 'TOR', executor)).toBe('TOR – Request No. 13');
  expect(executor.query.mock.calls.at(-1)[1]).toEqual([13, "STU'01", 'TOR']);
});
it('leaves unidentified scans unnumbered without touching SQL', async () => {
  const { executor } = ledger();
  expect(await model.allocate(null, 'TOR', executor)).toBeNull();
  expect(executor.query).not.toHaveBeenCalled();
});
it('refuses overflow before writing a reused or invalid number', async () => {
  const { executor } = ledger(4294967295);
  await expect(model.allocate('STU-001', 'TOR', executor)).rejects.toThrow(/limit/);
  expect(executor.query.mock.calls).toHaveLength(2);
});
