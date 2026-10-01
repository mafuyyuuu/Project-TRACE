const service = require('../supportMessage.service');
const model = require('../../models/supportMessage.model');
const desks = require('../../models/documentMessage.model');
const notifications = require('../notification.service');
const { pool } = require('../../config/db');
const student = { id: 3, role: 'student', full_name: 'Synthetic student' };
const desk = { id: 7, role: 'clerk', desk_assignment: 'Window 1' };
let connection;
beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(model, 'lockStudent').mockResolvedValue({ id: 3, role: 'student', is_active: 1 });
  vi.spyOn(model, 'insert').mockResolvedValue([{ insertId: 8 }]);
  vi.spyOn(model, 'messages').mockResolvedValue([{ id: 5, sender_id: 7, message: 'Reply' }]);
  vi.spyOn(model, 'markRead').mockResolvedValue([{}]);
  vi.spyOn(model, 'threads').mockResolvedValue({ threads: [], total: 0 });
  vi.spyOn(desks, 'window1Recipients').mockResolvedValue([{ id: 7 }]);
  vi.spyOn(notifications, 'notifyInAppBulk').mockResolvedValue({});
});
it.each([{ ...student, id: 4 }, { ...desk, desk_assignment: 'Finance' }, { ...desk, desk_assignment: 'Secretary' }])('denies other students and unrelated desks before any read or write', async actor => {
  await expect(service.read(actor, 3)).rejects.toMatchObject({ status: 403 });
  await expect(service.send(actor, 3, { message: 'Hello' })).rejects.toMatchObject({ status: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it.each([{ role: 'clerk', is_active: 1 }, { role: 'student', is_active: 0 }, null])('rejects unavailable or nonstudent targets', async account => {
  model.lockStudent.mockResolvedValue(account);
  await expect(service.send(desk, 3, { message: 'Hello' })).rejects.toMatchObject({ status: 404 });
  expect(model.insert).not.toHaveBeenCalled(); expect(connection.rollback).toHaveBeenCalledOnce();
});
it('accepts support before any document exists and notifies Window 1 after commit', async () => {
  expect(await service.send(student, 3, { message: '  How do I register?  ' })).toMatchObject({ id: 8, student_user_id: 3, message: 'How do I register?' });
  expect(model.insert).toHaveBeenCalledWith(3, 3, 'How do I register?', connection);
  expect(connection.commit).toHaveBeenCalledOnce();
  expect(notifications.notifyInAppBulk).toHaveBeenCalledWith([{ id: 7 }], expect.objectContaining({ actionUrl: '/dashboard?tab=messages&support=3' }));
});
it('routes desk replies only to the owning student and fails soft after accepted sends', async () => {
  notifications.notifyInAppBulk.mockRejectedValue(new Error('unavailable'));
  await expect(service.send(desk, 3, { message: 'Use Verify Email.' })).resolves.toHaveProperty('id', 8);
  expect(notifications.notifyInAppBulk.mock.calls[0][0]).toEqual([{ id: 3 }]);
  expect(connection.rollback).not.toHaveBeenCalled();
});
it('marks only the opposite side through the last read message', async () => {
  await service.read(student, 3);
  expect(model.markRead).toHaveBeenCalledWith(3, true, 5, connection);
  await service.read(desk, 3);
  expect(model.markRead).toHaveBeenCalledWith(3, false, 5, connection);
});
it('rolls back failed writes without sending success notifications', async () => {
  model.insert.mockRejectedValue(new Error('write failed'));
  await expect(service.send(student, 3, { message: 'Hello' })).rejects.toThrow('write failed');
  expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.commit).not.toHaveBeenCalled();
  expect(notifications.notifyInAppBulk).not.toHaveBeenCalled();
});
it.each(['', ' ', 'x'.repeat(2001), null, {}])('rejects invalid messages before a transaction', async message => {
  await expect(service.send(student, 3, { message })).rejects.toMatchObject({ status: 400 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('bounds pages and filters student inboxes by authenticated identity', async () => {
  await expect(service.list(student, '-1')).rejects.toMatchObject({ status: 400 });
  await service.list(student, '2'); expect(model.threads).toHaveBeenCalledWith(3, 2);
  await service.list(desk); expect(model.threads).toHaveBeenCalledWith(null, 1);
});
