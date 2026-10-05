const documents = require('../../models/document.model');
const messages = require('../../models/documentMessage.model');
const users = require('../../models/user.model');
const notifications = require('../notification.service');
const { pool } = require('../../config/db');
const service = require('../documents.service');
const student = { id: 3, role: 'student', full_name: 'Student' };
const w1 = { id: 4, role: 'clerk', desk_assignment: 'Window 1' };
const secretary = { id: 5, role: 'clerk', desk_assignment: 'Secretary' };
const doc = { id: 11, student_id: 'STU-001', tracking_number: 'TRC-TEST', document_type: 'TOR', current_status: 'SEC_PROCESSING' };
let connection;
beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(documents, 'findById').mockResolvedValue([doc]);
  vi.spyOn(documents, 'findByIdForUpdate').mockResolvedValue([doc]);
  vi.spyOn(users, 'findStudentIdById').mockResolvedValue([{ student_id: 'STU-001' }]);
  vi.spyOn(users, 'findCourseById').mockResolvedValue([{ college_id: 1, course: 'Engineering' }]);
  vi.spyOn(users, 'findStudentCourseByStudentId').mockResolvedValue([{ college_id: 1, course: 'Engineering' }]);
  vi.spyOn(users, 'findStudentContactByStudentId').mockResolvedValue([{ id: 3 }]);
  vi.spyOn(messages, 'insert').mockResolvedValue([{ insertId: 19 }]);
  vi.spyOn(messages, 'findByDocumentId').mockResolvedValue([{ id: 19, message: 'Hello' }]);
  vi.spyOn(messages, 'markAsRead').mockResolvedValue([]);
  vi.spyOn(messages, 'window1Recipients').mockResolvedValue([{ id: 4 }]);
  vi.spyOn(messages, 'threadList').mockResolvedValue([doc]);
  vi.spyOn(messages, 'countThreads').mockResolvedValue(1);
  vi.spyOn(notifications, 'notifyInAppBulk').mockResolvedValue(undefined);
});

it.each([null, {}, { message: 23 }, { message: ' ' }, { message: 'a'.repeat(2001) }])('rejects invalid messages before starting a transaction', async body => {
  await expect(service.sendMessage(student, 11, body || {})).rejects.toMatchObject({ status: 400 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('denies another student and rolls back without an insert', async () => {
  users.findStudentIdById.mockResolvedValue([{ student_id: 'OTHER' }]);
  await expect(service.sendMessage(student, 11, { message: 'Hello' })).rejects.toMatchObject({ status: 403 });
  await expect(service.getMessages(student, 11)).rejects.toMatchObject({ status: 403 });
  expect(messages.insert).not.toHaveBeenCalled(); expect(messages.markAsRead).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.release).toHaveBeenCalledOnce();
});
it.each([{ id: 8, role: 'visitor' }, { id: 8, role: 'clerk', desk_assignment: 'Unknown' }])('denies unrecognized staff', async user => {
  await expect(service.getMessages(user, 11)).rejects.toMatchObject({ status: 403 });
  await expect(service.messageThreads(user)).rejects.toMatchObject({ status: 403 });
});
it('restricts Secretary reads and sends to their saved college', async () => {
  users.findStudentCourseByStudentId.mockResolvedValue([{ college_id: 2, course: 'Nursing' }]);
  await expect(service.getMessages(secretary, 11)).rejects.toMatchObject({ status: 403 });
  await expect(service.sendMessage(secretary, 11, { message: 'Hello' })).rejects.toMatchObject({ status: 403 });
  expect(messages.insert).not.toHaveBeenCalled();
});
it('fails closed when a Secretary has no college assignment', async () => {
  users.findCourseById.mockResolvedValue([]);
  await expect(service.messageThreads(secretary)).rejects.toMatchObject({ status: 403 });
  expect(messages.threadList).not.toHaveBeenCalled();
});
it('notifies Window 1 after an unassigned request message is committed', async () => {
  const result = await service.sendMessage(student, 11, { message: ' Hello ' });
  expect(messages.insert).toHaveBeenCalledWith(11, 3, 'Hello', connection);
  expect(connection.commit).toHaveBeenCalledOnce();
  expect(notifications.notifyInAppBulk).toHaveBeenCalledWith([{ id: 4 }], expect.objectContaining({ actionUrl: '/dashboard?tab=messages&document=11' }));
  expect(result.sent).toMatchObject({ id: 19, sender_id: 3, message: 'Hello' });
});
it('keeps a committed send successful when notification delivery fails', async () => {
  notifications.notifyInAppBulk.mockRejectedValue(new Error('Unavailable'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(service.sendMessage(w1, 11, { message: 'Reply' })).resolves.toMatchObject({ sent: { id: 19 } });
  expect(connection.rollback).not.toHaveBeenCalled();
});
it('does not let other desks clear Window 1 unread messages', async () => {
  await service.getMessages(secretary, 11);
  expect(messages.markAsRead).not.toHaveBeenCalled();
  await service.getMessages(w1, 11);
  expect(messages.markAsRead).toHaveBeenCalledWith(11, 'staff');
  await service.getMessages(student, 11);
  expect(messages.markAsRead).toHaveBeenCalledWith(11, 'student');
});
it('scopes and caps thread pagination on the server', async () => {
  await service.messageThreads(student, { page: '-1', limit: '9000' });
  expect(messages.threadList).toHaveBeenCalledWith(['student.id = ?'], [3], 1, 50, 'student');
  await service.messageThreads(secretary);
  expect(messages.countThreads).toHaveBeenLastCalledWith([expect.stringContaining('student.college_id')], [1, 'Engineering']);
});

it.each(['COMPLETED', 'REJECTED', 'APPROVED', 'unexpected'])('retains readable %s history but refuses new messages under the document lock', async current_status => {
  documents.findById.mockResolvedValue([{ ...doc, current_status }]);
  documents.findByIdForUpdate.mockResolvedValue([{ ...doc, current_status }]);
  await expect(service.getMessages(student, 11)).resolves.toEqual([{ id: 19, message: 'Hello' }]);
  await expect(service.sendMessage(student, 11, { message: 'Hello' })).rejects.toMatchObject({ status: 400 });
  expect(messages.insert).not.toHaveBeenCalled(); expect(connection.rollback).toHaveBeenCalledOnce();
});
