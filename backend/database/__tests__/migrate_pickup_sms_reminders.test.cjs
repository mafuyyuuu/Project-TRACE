const { migrate } = require('../migrate_pickup_sms_reminders');

it('creates an idempotent attempt ledger without rewriting existing records', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await migrate(executor);
  await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);
  const sql = executor.query.mock.calls[0][0];
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS');
  expect(sql).toContain('UNIQUE KEY pickup_sms_once (document_id, ready_step_id, period_no)');
  expect(sql).not.toMatch(/^(?:UPDATE|DELETE|TRUNCATE)\b/m);
});
