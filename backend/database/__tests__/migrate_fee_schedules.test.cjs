const { migrate, SCHEDULE_DDL } = require('../migrate_fee_schedules');
it('creates only missing columns, widens notes, and preserves existing data', async () => {
  const executor = { query: vi.fn(async (sql, params) => {
    if (sql.includes('INFORMATION_SCHEMA') && params) return [params[1] === 'rental_fee' ? [{ COLUMN_NAME: 'rental_fee' }] : []];
    if (sql.includes('INFORMATION_SCHEMA')) return [[{ DATA_TYPE: 'varchar' }]];
    return [[]];
  }) };
  await migrate(executor);
  const statements = executor.query.mock.calls.map(call => call[0]);
  expect(statements.filter(sql => sql.startsWith('ALTER TABLE'))).toHaveLength(5);
  expect(statements).toContain('ALTER TABLE documents ADD COLUMN document_sequence_number VARCHAR(255) NULL');
  expect(statements.some(sql => /ADD COLUMN rental_fee/.test(sql))).toBe(false);
  expect(statements.some(sql => /MODIFY COLUMN pricing_notes TEXT/.test(sql))).toBe(true);
  expect(statements.some(sql => /DELETE|UPDATE |DROP |INSERT/.test(sql))).toBe(false);
  expect(statements.at(-1)).toBe(SCHEDULE_DDL);
  expect(SCHEDULE_DDL).toContain('UNIQUE KEY fee_schedule_type_college');
});
it('is safe to rerun after all columns exist', async () => {
  const executor = { query: vi.fn(async sql => sql.includes('INFORMATION_SCHEMA') ? [[{ COLUMN_NAME: 'exists', DATA_TYPE: 'text' }]] : [[]]) };
  await migrate(executor); await migrate(executor);
  expect(executor.query.mock.calls.some(([sql]) => sql.startsWith('ALTER'))).toBe(false);
});
it('stops on DDL failure so it can be retried explicitly', async () => {
  const executor = { query: vi.fn().mockResolvedValueOnce([[]]).mockRejectedValueOnce(new Error('denied')) };
  await expect(migrate(executor)).rejects.toThrow('denied');
  expect(executor.query).toHaveBeenCalledTimes(2);
});
