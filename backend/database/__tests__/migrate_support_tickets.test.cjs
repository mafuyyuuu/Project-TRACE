const { migrate, statements } = require('../migrate_support_tickets');
it('creates durable queue and retry constraints and imports history transactionally without deleting sources', async () => {
  const tx = { query: vi.fn().mockResolvedValue([[]]), beginTransaction: vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn() };
  const executor = { query:vi.fn().mockResolvedValue([[]]),getConnection:vi.fn().mockResolvedValue(tx) };
  await migrate(executor);
  const ddl = statements.join('\n');
  expect(ddl).toContain('UNIQUE KEY support_one_open_general'); expect(ddl).toContain('UNIQUE KEY support_one_live_clerk'); expect(ddl).toContain('UNIQUE KEY support_send_retry');
  const importSql = tx.query.mock.calls.map(([sql]) => sql).join('\n');
  expect(importSql).toContain('FROM support_messages GROUP BY student_user_id');
  expect(importSql).toContain('FROM document_messages m JOIN documents');
  expect(importSql).toContain('ON DUPLICATE KEY UPDATE'); expect(importSql).not.toMatch(/DELETE|TRUNCATE|DROP/i);
  expect(tx.commit).toHaveBeenCalledOnce(); expect(tx.rollback).not.toHaveBeenCalled(); expect(tx.release).toHaveBeenCalledOnce();
});
it('rolls back failed history import and leaves writer resume to the operator', async () => {
  const tx = { query:vi.fn().mockRejectedValue(new Error('Synthetic failure')), beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn() };
  await expect(migrate({ query:vi.fn(),getConnection:vi.fn().mockResolvedValue(tx) })).rejects.toThrow('Synthetic failure');
  expect(tx.rollback).toHaveBeenCalledOnce(); expect(tx.commit).not.toHaveBeenCalled(); expect(tx.release).toHaveBeenCalledOnce();
});
