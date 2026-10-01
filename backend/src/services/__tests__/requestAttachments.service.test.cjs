const service = require('../requestAttachments.service');
const model = require('../../models/requestAttachment.model');
const documents = require('../../models/document.model');
const users = require('../../models/user.model');
const messages = require('../../models/documentMessage.model');
const logs = require('../../models/stepLog.model');
const notifications = require('../notification.service');
const { pool } = require('../../config/db');
const student = { id: 3, role: 'student' };
const clerk = { id: 4, role: 'clerk', desk_assignment: 'Window 1' };
const secretary = { id: 5, role: 'clerk', desk_assignment: 'Secretary' };
const doc = { id: 11, student_id: 'TEST-1', tracking_number: 'TRC-TEST', current_status: 'SEC_PROCESSING' };
const file = { filename: 'case.pdf', originalname: 'school-record.pdf' };
let tx;
beforeEach(() => {
  tx = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(tx);
  vi.spyOn(documents, 'findById').mockResolvedValue([doc]);
  vi.spyOn(documents, 'findByIdForUpdate').mockResolvedValue([doc]);
  vi.spyOn(users, 'findStudentIdById').mockResolvedValue([{ student_id: 'TEST-1' }]);
  vi.spyOn(users, 'findCourseById').mockResolvedValue([{ college_id: 1 }]);
  vi.spyOn(users, 'findStudentCourseByStudentId').mockResolvedValue([{ college_id: 1 }]);
  vi.spyOn(users, 'findStudentContactByStudentId').mockResolvedValue([{ id: 3 }]);
  vi.spyOn(messages, 'window1Recipients').mockResolvedValue([{ id: 4 }]);
  vi.spyOn(notifications, 'notifyInAppBulk').mockResolvedValue(undefined);
  vi.spyOn(model, 'list').mockResolvedValue([]);
  vi.spyOn(model, 'lock').mockResolvedValue({ id: 9, document_id: 11, status: 'requested' });
  for (const method of ['create', 'upload', 'markUploaded', 'review']) vi.spyOn(model, method).mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(logs, 'insert').mockResolvedValue([]);
});
it('has no universal required attachments on an ordinary request', async () => {
  await expect(service.list(student, 11)).resolves.toEqual({ requirements: [] });
});
it.each([student, { id: 7, role: 'clerk', desk_assignment: 'Finance' }])('limits requesting/reviewing to Registrar staff', async user => {
  await expect(service.mutate(user, 11, 'request', null, { label: 'Record', instructions: 'Please submit this case record.' })).rejects.toMatchObject({ status: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('locks the request and audits the case instruction without changing its pipeline stage', async () => {
  await service.mutate(clerk, 11, 'request', null, { label: ' Prior school record ', instructions: ' Send a legible copy. ' });
  expect(documents.findByIdForUpdate).toHaveBeenCalledWith(11, tx);
  expect(model.create).toHaveBeenCalledWith(11, 4, 'Prior school record', 'Send a legible copy.', tx);
  expect(logs.insert).toHaveBeenCalledWith(expect.objectContaining({ from_status: 'SEC_PROCESSING', to_status: 'SEC_PROCESSING', action_taken: 'attachment_request' }), tx);
  expect(tx.commit).toHaveBeenCalledOnce();
  expect(notifications.notifyInAppBulk).toHaveBeenCalledWith([{ id: 3 }], expect.objectContaining({ actionUrl: '/dashboard?tab=messages&document=11' }));
});
it('prevents another student reading or uploading to the request', async () => {
  users.findStudentIdById.mockResolvedValue([{ student_id: 'OTHER' }]);
  await expect(service.list(student, 11)).rejects.toMatchObject({ status: 403 });
  await expect(service.mutate(student, 11, 'upload', 9, {}, file)).rejects.toMatchObject({ status: 403 });
  expect(model.upload).not.toHaveBeenCalled(); expect(tx.rollback).toHaveBeenCalledOnce();
});
it('restricts Secretary requests and reads to the assigned college', async () => {
  users.findStudentCourseByStudentId.mockResolvedValue([{ college_id: 2 }]);
  await expect(service.list(secretary, 11)).rejects.toMatchObject({ status: 403 });
  await expect(service.mutate(secretary, 11, 'request', null, { label: 'Record', instructions: 'Send copy.' })).rejects.toMatchObject({ status: 403 });
  expect(model.create).not.toHaveBeenCalled();
});
it('binds every upload to a requirement on this request', async () => {
  model.lock.mockResolvedValue(undefined);
  await expect(service.mutate(student, 11, 'upload', 999, {}, file)).rejects.toMatchObject({ status: 404 });
  expect(model.lock).toHaveBeenCalledWith(999, 11, tx); expect(model.upload).not.toHaveBeenCalled();
});
it('notifies Window 1 when a student uploads and retains the upload history', async () => {
  await service.mutate(student, 11, 'upload', 9, {}, file);
  expect(model.upload).toHaveBeenCalledWith(9, 3, file, tx);
  expect(model.markUploaded).toHaveBeenCalledWith(9, tx);
  expect(logs.insert).toHaveBeenCalledWith(expect.objectContaining({ clerk_id: null }), tx);
  expect(notifications.notifyInAppBulk).toHaveBeenCalledWith([{ id: 4 }], expect.objectContaining({ title: 'Pertinent document submitted' }));
});
it.each(['uploaded', 'accepted'])('does not overwrite a %s attachment', async status => {
  model.lock.mockResolvedValue({ id: 9, status });
  await expect(service.mutate(student, 11, 'upload', 9, {}, file)).rejects.toMatchObject({ status: 400 });
  expect(model.upload).not.toHaveBeenCalled();
});
it('allows review and a reasoned resubmission only after an upload', async () => {
  await expect(service.mutate(clerk, 11, 'review', 9, { action: 'accept' })).rejects.toMatchObject({ status: 400 });
  model.lock.mockResolvedValue({ id: 9, status: 'uploaded' });
  await service.mutate(clerk, 11, 'review', 9, { action: 'resubmit', notes: 'Please scan the back page too.' });
  expect(model.review).toHaveBeenCalledWith(9, 4, 'resubmit', 'Please scan the back page too.', tx);
});
it.each([{ action: 'resubmit', notes: 4 }, { action: 'resubmit', notes: '' }, { action: 'accept', notes: {} }, { action: 'wrong' }])('rejects malformed review details safely', async body => {
  await expect(service.mutate(clerk, 11, 'review', 9, body)).rejects.toMatchObject({ status: 400 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('rolls back both attachment and audit writes when storage fails', async () => {
  logs.insert.mockRejectedValue(new Error('Database unavailable'));
  await expect(service.mutate(student, 11, 'upload', 9, {}, file)).rejects.toThrow('Database unavailable');
  expect(tx.rollback).toHaveBeenCalledOnce(); expect(tx.commit).not.toHaveBeenCalled(); expect(tx.release).toHaveBeenCalledOnce();
  expect(notifications.notifyInAppBulk).not.toHaveBeenCalled();
});
it('does not turn a committed save into a failure when notification delivery fails', async () => {
  notifications.notifyInAppBulk.mockRejectedValue(new Error('Offline'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(service.mutate(student, 11, 'upload', 9, {}, file)).resolves.toMatchObject({ message: expect.any(String) });
  expect(tx.rollback).not.toHaveBeenCalled();
});
