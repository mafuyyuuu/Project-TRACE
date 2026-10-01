const service = require('../finance.service');
const model = require('../../models/finance.model');
const { pool } = require('../../config/db');
const FINANCE = { id: 4, role: 'clerk', desk_assignment: 'Finance' };
let connection;
beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(model, 'summary').mockResolvedValue({ total: 1, amount: 300 });
  vi.spyOn(model, 'list').mockResolvedValue([{ id: 1, request_group_id: 'REQ-1', student_name: '=HYPERLINK("bad")', amount: 300, documents_covered: 2, payment_cleared_at: '2026-10-01T01:00:00Z', or_number: null }]);
});
it.each([{ role: 'student' }, { role: 'admin' }, { role: 'clerk', desk_assignment: 'Secretary' }])('does not expose Finance payments or exports to other roles', async user => {
  await expect(service.transactions(user, {}, true)).rejects.toMatchObject({ status: 403 });
  expect(model.list).not.toHaveBeenCalled();
});
it('paginates complete request groups without treating documents as separate payments', async () => {
  const result = await service.transactions(FINANCE, { page: 2, receipt: 'pending' });
  expect(model.list).toHaveBeenCalledWith({ from: '', to: '', receipt: 'pending' }, 25, 25, connection);
  expect(result).toMatchObject({ total: 1, amount: 300, page: 2 });
  expect(connection.commit).toHaveBeenCalledOnce();
});
it.each([{ page: 1.2 }, { from: '2026-02-29' }, { from: '2026-10-02', to: '2026-10-01' }, { receipt: "' OR 1=1" }])('rejects invalid filters %j', async query => {
  await expect(service.transactions(FINANCE, query)).rejects.toMatchObject({ status: 400 });
  expect(model.list).not.toHaveBeenCalled();
});
it('exports actual groups, Manila dates, peso amounts and escaped formula text', async () => {
  const result = await service.transactions(FINANCE, {}, true);
  expect(result.filename).toMatch(/^finance-transactions-.*\.csv$/);
  expect(result.csv).toContain('₱300.00');
  expect(result.csv).toContain("'=HYPERLINK");
  expect(result.csv).toContain('Issuance pending');
  expect(model.list).toHaveBeenCalledWith(expect.any(Object), 10000, 0, connection);
});
it('never silently truncates exports', async () => {
  model.summary.mockResolvedValue({ total: 10001, amount: 0 });
  await expect(service.transactions(FINANCE, {}, true)).rejects.toThrow('Narrow');
  expect(model.list).not.toHaveBeenCalled(); expect(connection.rollback).toHaveBeenCalledOnce();
});
