const service = require('../requestAssignment.service');
const documentsService = require('../documents.service');
const documents = require('../../models/document.model');
const users = require('../../models/user.model');
const references = require('../../models/referenceData.model');
const logs = require('../../models/stepLog.model');
const { pool } = require('../../config/db');
const admin = { id: 1, role: 'admin', is_active: 1 };
const secretary = { id: 2, role: 'clerk', desk_assignment: 'Secretary', is_active: 1 };
const doc = { id: 9, student_id: 'SYN-1', current_status: 'PENDING_SEC_EVALUATION', routing_college_id: 3, assigned_clerk_id: null };
let tx;
beforeEach(() => {
  tx = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(tx);
  vi.spyOn(documents, 'findById').mockResolvedValue([doc]);
  vi.spyOn(documents, 'findByIdForUpdate').mockResolvedValue([doc]);
  vi.spyOn(documents, 'updateAssignedClerk').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(users, 'findById').mockImplementation(async id => [id === 1 ? admin : secretary]);
  vi.spyOn(users, 'findCourseById').mockResolvedValue([{ college_id: 3 }]);
  vi.spyOn(users, 'findStudentCourseByStudentId').mockResolvedValue([{ college_id: 3 }]);
  vi.spyOn(users, 'listStaff').mockResolvedValue([{ ...secretary, full_name: 'Synthetic Secretary' }]);
  vi.spyOn(users, 'findClerkByEmployeeId').mockResolvedValue([secretary]);
  vi.spyOn(references, 'findCollegeById').mockResolvedValue([{ id: 3, name: 'Synthetic College', is_active: 1 }]);
  vi.spyOn(references, 'findCollegeByName').mockResolvedValue([]);
  vi.spyOn(logs, 'insert').mockResolvedValue([]);
});
const payload = { staff_id: 2, reason: 'Assigned backup during leave.', expected_staff_id: null, expected_status: doc.current_status };

it('records an Admin assignment inside the request lock and keeps its stage', async () => {
  await service.reassign(admin, 9, payload);
  expect(documents.findByIdForUpdate).toHaveBeenCalledWith(9, tx);
  expect(documents.updateAssignedClerk).toHaveBeenCalledWith(9, 2, tx);
  expect(logs.insert).toHaveBeenCalledWith(expect.objectContaining({ clerk_id: 1, action_taken: 'staff_reassigned', to_status: doc.current_status }), tx);
  expect(tx.commit).toHaveBeenCalledOnce();
});
it.each([secretary, { id: 1, role: 'clerk', desk_assignment: 'Window 1' }])('denies non-Admin assignment authority (%j)', async actor => {
  await expect(service.reassign(actor, 9, payload)).rejects.toMatchObject({ status: 403 });
  expect(documents.updateAssignedClerk).not.toHaveBeenCalled();
});
it.each([{ assigned_clerk_id: 2 }, { current_status: 'SEC_PROCESSING' }])('rejects a stale assignment snapshot (%j)', async changes => {
  documents.findByIdForUpdate.mockResolvedValue([{ ...doc, ...changes }]);
  await expect(service.reassign(admin, 9, payload)).rejects.toThrow(/changed/);
  expect(tx.rollback).toHaveBeenCalledOnce();
  expect(documents.updateAssignedClerk).not.toHaveBeenCalled();
});
it.each([{ role: 'student' }, { desk_assignment: 'Finance' }, { is_active: 0 }])('denies an ineligible backup (%j)', async changes => {
  users.listStaff.mockResolvedValue([{ ...secretary, ...changes }]);
  await expect(service.reassign(admin, 9, payload)).rejects.toMatchObject({ status: 403 });
});
it('denies cross-college backup staff even when Admin submits the staff ID', async () => {
  users.findCourseById.mockResolvedValue([{ college_id: 7 }]);
  await expect(service.reassign(admin, 9, payload)).rejects.toMatchObject({ status: 403 });
});
it('fails closed when the former college is missing or inactive', async () => {
  users.findStudentCourseByStudentId.mockResolvedValue([{ college_id: null }]);
  await expect(service.collegeForStudent('SYN-1')).rejects.toThrow(/reconcile/);
  users.findStudentCourseByStudentId.mockResolvedValue([{ college_id: 3 }]);
  references.findCollegeById.mockResolvedValue([{ id: 3, name: 'Archived College', is_active: 0 }]);
  await expect(service.collegeForStudent('SYN-1')).rejects.toThrow(/reconcile/);
});
it('uses the recorded former college and ignores client routing suggestions', async () => {
  expect(await service.collegeForStudent('SYN-1')).toMatchObject({ id: 3 });
  expect(users.findStudentCourseByStudentId).toHaveBeenCalledWith('SYN-1', pool);
});
it('requires one exact active mapping for a legacy former-college name', async () => {
  users.findStudentCourseByStudentId.mockResolvedValue([{ course: 'Old College' }]);
  references.findCollegeByName.mockResolvedValue([{ id: 4, name: 'Old College', is_active: 1 }]);
  expect(await service.collegeForStudent('SYN-1')).toMatchObject({ id: 4 });
});
it('keeps a routing snapshot authoritative after a student profile changes college', async () => {
  users.findStudentCourseByStudentId.mockResolvedValue([{ college_id: 7 }]);
  await expect(service.assertSecretaryScope(secretary, doc)).resolves.toBeUndefined();
  users.findCourseById.mockResolvedValue([{ college_id: 7 }]);
  await expect(service.assertSecretaryScope(secretary, { ...doc, assigned_clerk_id: 2 })).rejects.toMatchObject({ status: 403 });
});
it('permits same-college viewing but requires reassignment before another Secretary acts', async () => {
  await expect(service.assertSecretaryScope(secretary, { ...doc, assigned_clerk_id: 8 })).resolves.toBeUndefined();
  await expect(service.assertSecretaryScope(secretary, { ...doc, assigned_clerk_id: 8 }, pool, { assigned: true })).rejects.toThrow(/reassign/);
});
it.each(['Window 1','Finance'])('honors a named %s backup without granting a different desk access', async desk => {
  users.findById.mockResolvedValue([{id:8,role:'clerk',desk_assignment:desk}]);
  const actor={id:2,role:'clerk',desk_assignment:desk};
  await expect(service.assertAssignedProcessor(actor,{...doc,assigned_clerk_id:8})).rejects.toThrow(/reassign/);
  await expect(service.assertAssignedProcessor(actor,{...doc,assigned_clerk_id:2})).resolves.toBeUndefined();
});
it('makes duplicate routing idempotent and never overwrites an Admin assignment', async () => {
  documents.findByIdForUpdate.mockResolvedValue([{ ...doc, assigned_clerk_id: 2 }]);
  await documentsService.assignDocument({ document_id: 9, assigned_clerk_employee_id: 'SEC-SYN001' });
  expect(documents.updateAssignedClerk).not.toHaveBeenCalled();
  expect(logs.insert).not.toHaveBeenCalled();
  documents.findByIdForUpdate.mockResolvedValue([{ ...doc, assigned_clerk_id: 8 }]);
  await expect(documentsService.assignDocument({ document_id: 9, assigned_clerk_employee_id: 'SEC-SYN001' })).rejects.toThrow(/Admin/);
});
it('rejects late routing after processing has advanced', async () => {
  documents.findByIdForUpdate.mockResolvedValue([{ ...doc, current_status: 'SEC_PROCESSING' }]);
  await expect(documentsService.assignDocument({ document_id: 9, assigned_clerk_employee_id: 'SEC-SYN001' })).rejects.toThrow(/after intake/);
});
it('denies a cross-college authenticated detail lookup', async () => {
  users.findCourseById.mockResolvedValue([{ college_id: 7 }]);
  await expect(documentsService.requestDetail(secretary, 9)).rejects.toMatchObject({ status: 403 });
});
it('rejects a manipulated student ID from another college before evaluation writes', async () => {
  users.findStudentCourseByStudentId.mockResolvedValue([{college_id:7}]);
  const update=vi.spyOn(documents,'updateEvaluation').mockResolvedValue([]);
  await expect(documentsService.acceptForProcessing(secretary,9,{action:'approve',estimated_ready_date:'2026-10-12',student_id:'FORGED-OTHER'})).rejects.toMatchObject({status:403});
  expect(update).not.toHaveBeenCalled();
  expect(tx.rollback).toHaveBeenCalledOnce();
});
it('reconciles the alumnus’s recorded former college without rewriting routed requests', async () => {
  documents.findByIdForUpdate.mockResolvedValue([{...doc,current_status:'PENDING_W1_INTAKE',routing_college_id:null}]);
  vi.spyOn(users,'findStudentForPolicy').mockResolvedValue([{id:12,student_id:'SYN-1',college_id:null,user_type:'alumni'}]);
  vi.spyOn(users,'updateProfile').mockResolvedValue([]);
  await service.reconcileCollege(admin,9,{college_id:3,expected_college_id:null,reason:'Verified old college in the alumni register.',student_id:'FORGED'});
  expect(users.updateProfile).toHaveBeenCalledWith(12,{college_id:3,course:'Synthetic College'},tx);
  expect(logs.insert).toHaveBeenCalledWith(expect.objectContaining({action_taken:'profile_college_reconciled',notes:expect.stringContaining('former college')}),tx);
  expect(documents.updateAssignedClerk).not.toHaveBeenCalled();
});
it('cannot reconcile an already routed request or grant the operation to a Secretary', async () => {
  await expect(service.reconcileCollege(admin,9,{college_id:3,reason:'Verified register.',expected_college_id:null})).rejects.toThrow(/without a saved routing/);
  await expect(service.reconcileCollege(secretary,9,{college_id:3,reason:'Verified register.',expected_college_id:null})).rejects.toMatchObject({status:403});
});
it('redacts identity, receipt files and private notes from public progress tracking', async () => {
  vi.spyOn(documents,'findByTrackingNumber').mockResolvedValue([{...doc,tracking_number:'TRC-SYN',student_name:'Private student',file_path:'/uploads/proof.png',or_number:'PRIVATE-OR'}]);
  vi.spyOn(logs,'findByDocumentId').mockResolvedValue([{action_taken:'intake_returned',notes:'Private clearance note',clerk_name:'Private clerk',to_status:'PENDING_W1_INTAKE'}]);
  const result=await documentsService.trackByTrackingNumber('TRC-SYN');
  expect(JSON.stringify(result)).not.toMatch(/Private|uploads|PRIVATE-OR|SYN-1/);
  expect(result.document).toMatchObject({tracking_number:'TRC-SYN',current_status:doc.current_status});
});

it('lets Admin inspect and reconcile a legacy Secretary request with missing college scope', async () => {
  const legacy = {...doc, routing_college_id: null};
  documents.findById.mockResolvedValue([legacy]);
  documents.findByIdForUpdate.mockResolvedValue([legacy]);
  users.findStudentCourseByStudentId.mockResolvedValue([{college_id:null}]);
  vi.spyOn(users,'findStudentForPolicy').mockResolvedValue([{id:12,student_id:'SYN-1',college_id:null,user_type:'alumni'}]);
  vi.spyOn(references,'listColleges').mockResolvedValue([{id:3,name:'Synthetic College',is_active:1}]);
  vi.spyOn(users,'updateProfile').mockResolvedValue([]);
  vi.spyOn(documents,'updateRoutingCollege').mockResolvedValue([]);
  const context = await service.context(admin,9);
  expect(context).toMatchObject({can_reconcile_college:true,staff:[],profile_college_id:null});
  expect(context.college_warning).toMatch(/reconcile/);
  await service.reconcileCollege(admin,9,{college_id:3,expected_college_id:null,reason:'Verified institutional register.'});
  expect(documents.updateRoutingCollege).toHaveBeenCalledWith(9,{id:3,name:'Synthetic College',is_active:1},tx);
  expect(logs.insert).toHaveBeenCalledWith(expect.objectContaining({from_status:doc.current_status,to_status:doc.current_status,action_taken:'profile_college_reconciled'}),tx);
});
it('rejects a concurrent profile-college correction without changing the profile or scope', async () => {
  documents.findByIdForUpdate.mockResolvedValue([{...doc,routing_college_id:null}]);
  vi.spyOn(users,'findStudentForPolicy').mockResolvedValue([{id:12,college_id:7}]);
  const update=vi.spyOn(users,'updateProfile').mockResolvedValue([]);
  await expect(service.reconcileCollege(admin,9,{college_id:3,expected_college_id:null,reason:'Verified register.'})).rejects.toThrow(/changed/);
  expect(update).not.toHaveBeenCalled();
  expect(tx.rollback).toHaveBeenCalledOnce();
});

it('does not assign closed requests to clerks with no desk',async()=>{
  documents.findByIdForUpdate.mockResolvedValue([{...doc,current_status:'COMPLETED'}]);
  users.listStaff.mockResolvedValue([{...secretary,desk_assignment:null}]);
  await expect(service.reassign(admin,9,{...payload,expected_status:'COMPLETED'})).rejects.toMatchObject({status:403});
  expect(documents.updateAssignedClerk).not.toHaveBeenCalled();
  expect(tx.rollback).toHaveBeenCalledOnce();
});
