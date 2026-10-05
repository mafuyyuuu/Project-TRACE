const service = require('../requestAttachments.service');
const model = require('../../models/requestAttachment.model');
const tickets = require('../supportTicket.service');
const catalog = require('../../models/supportingDocument.model');
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
  tx = { query:vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(tx);
  vi.spyOn(tickets,'currentActor').mockImplementation(async user => ({...user,is_active:1,email_verified_at:new Date()}));
  vi.spyOn(require('../../models/supportTicket.model'),'linked').mockResolvedValue({id:10});
  vi.spyOn(catalog,'list').mockResolvedValue([{id:2,name:'Prior school record',is_active:1}]);
  vi.spyOn(catalog,'find').mockResolvedValue({id:2,name:'Prior school record',is_active:1});
  for(const method of ['supersede','event','bubble']) vi.spyOn(model,method).mockResolvedValue([]);
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
  for (const method of ['upload', 'markUploaded', 'review']) vi.spyOn(model, method).mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(model,'create').mockResolvedValue(9);
  vi.spyOn(logs, 'insert').mockResolvedValue([]);
});
it('has no universal required attachments on an ordinary request', async () => {
  await expect(service.list(student, 11)).resolves.toMatchObject({ requirements: [] });
});
it.each([student, { id: 7, role: 'clerk', desk_assignment: 'Finance' }])('limits requesting/reviewing to Registrar staff', async user => {
  await expect(service.mutate(user, 11, 'request', null, { catalog_id:2, instructions: 'Please submit this case record.' })).rejects.toMatchObject({ status: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('locks the request and audits the case instruction without changing its pipeline stage', async () => {
  await service.mutate(clerk, 11, 'request', null, { catalog_id:2, instructions: ' Send a legible copy. ' });
  expect(documents.findByIdForUpdate).toHaveBeenCalledWith(11, tx);
  expect(model.create).toHaveBeenCalledWith(11, 4, 'Prior school record', 'Send a legible copy.', tx,expect.objectContaining({identity_key:'catalog:2',catalog_id:2}));
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
  await expect(service.mutate(secretary, 11, 'request', null, { catalog_id:2, instructions: 'Send copy.' })).rejects.toMatchObject({ status: 403 });
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
it.each(['requested','uploaded','accepted'])('rejects an ordinary duplicate %s catalog requirement under the case lock',async status => {
  model.list.mockResolvedValue([{id:9,identity_key:'catalog:2',status}]);
  await expect(service.mutate(clerk,11,'request',null,{catalog_id:2,instructions:'Send the record.'})).rejects.toMatchObject({status:400});
  expect(model.create).not.toHaveBeenCalled();expect(tx.rollback).toHaveBeenCalledOnce();
});
it('preserves a submitted requirement through an explicit replacement chain',async () => {
  model.list.mockResolvedValue([{id:9,identity_key:'catalog:2',status:'accepted'}]);
  model.lock.mockResolvedValue({id:9,identity_key:'catalog:2',status:'accepted'});
  model.create.mockResolvedValue(10);
  await service.mutate(clerk,11,'request',null,{catalog_id:2,replacement_of:9,instructions:'Please include the missing back page.'});
  expect(model.supersede).toHaveBeenCalledWith(9,tx);
  expect(model.event).toHaveBeenCalledWith(expect.objectContaining({id:10,replacement_of:9}),4,'replacement_requested',tx);
  expect(model.bubble).toHaveBeenCalledWith(expect.objectContaining({id:10}),tx);
});
it('records immutable rejection and submission events while allowing a corrected upload',async () => {
  model.lock.mockResolvedValue({id:9,document_id:11,status:'rejected'});
  await service.mutate(student,11,'upload',9,{},file);
  expect(model.event).toHaveBeenCalledWith(expect.objectContaining({id:9,status:'uploaded',original_filename:'school-record.pdf'}),3,'submitted',tx);
});
it('rejects replaced and unverified-account uploads before storing metadata',async () => {
  model.lock.mockResolvedValue({id:9,status:'requested',superseded_at:new Date()});
  await expect(service.mutate(student,11,'upload',9,{},file)).rejects.toMatchObject({status:400});
  model.lock.mockResolvedValue({id:9,status:'requested'});
  tickets.currentActor.mockResolvedValue({...student,email_verified_at:null});
  await expect(service.mutate(student,11,'upload',9,{},file)).rejects.toMatchObject({status:403});
  expect(model.upload).not.toHaveBeenCalled();
});
it.each(['COMPLETED', 'REJECTED', 'APPROVED', 'unexpected'])('keeps %s case history readable but rejects every mutation', async current_status => {
  documents.findById.mockResolvedValue([{ ...doc, current_status }]);
  documents.findByIdForUpdate.mockResolvedValue([{ ...doc, current_status }]);
  await expect(service.list(student, 11)).resolves.toMatchObject({ requirements: [] });
  for (const [actor, kind, id, body, upload] of [
    [clerk, 'request', null, { catalog_id:2, instructions: 'Send a copy.' }],
    [student, 'upload', 9, {}, file],
    [clerk, 'review', 9, { action: 'accept' }],
  ]) await expect(service.mutate(actor, 11, kind, id, body, upload)).rejects.toMatchObject({ status: 400 });
  expect(model.create).not.toHaveBeenCalled(); expect(model.upload).not.toHaveBeenCalled(); expect(model.review).not.toHaveBeenCalled();
  expect(tx.commit).not.toHaveBeenCalled();
});
it('retries a deadlock with a fresh transaction without duplicating notification delivery',async()=>{
  logs.insert.mockRejectedValueOnce(Object.assign(new Error('Synthetic deadlock'),{code:'ER_LOCK_DEADLOCK'})).mockResolvedValue([]);
  await service.mutate(student,11,'upload',9,{},file);
  expect(tx.query).toHaveBeenCalledWith('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
  expect(tx.beginTransaction).toHaveBeenCalledTimes(2);expect(tx.rollback).toHaveBeenCalledOnce();expect(tx.commit).toHaveBeenCalledOnce();
  expect(notifications.notifyInAppBulk).toHaveBeenCalledOnce();
});
it('authorizes requirement history against its exact document case',async()=>{
  vi.spyOn(model,'history').mockResolvedValue({events:[],next_cursor:null});
  model.list.mockResolvedValue([{id:9}]);
  await expect(service.history(student,11,9,4)).resolves.toEqual({events:[],next_cursor:null});
  expect(model.history).toHaveBeenCalledWith(9,11,4);
  await expect(service.history(student,11,10)).rejects.toMatchObject({status:404});
  users.findStudentIdById.mockResolvedValue([{student_id:'OTHER'}]);
  await expect(service.history(student,11,9)).rejects.toMatchObject({status:403});
});
