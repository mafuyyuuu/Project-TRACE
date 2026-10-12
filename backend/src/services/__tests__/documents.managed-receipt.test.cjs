const documents=require('../documents.service');
const model=require('../../models/document.model');
const ledger=require('../../models/receiptPack.model');
const users=require('../../models/user.model');
const logs=require('../../models/stepLog.model');
const assignments=require('../requestAssignment.service');
const notifications=require('../notification.service');
const {pool}=require('../../config/db');
const {STATUS}=require('../../utils/documentStatus');
const {packPattern}=require('../../utils/receiptSerial');
const user={id:4,role:'clerk',desk_assignment:'Finance',is_active:1,full_name:'Demo Cashier'};
let connection,group;
const body={action:'approve',use_pack:true,expected_pack_id:1,expected_serial:'DEMO00001',client_key:'demo-approval-retry-0001',payor_name:'Person, Demo'};
beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T01:00:00Z'));
 group=[{id:11,request_group_id:'DEMO',tracking_number:'DEMO11',student_id:'DEMO001',student_name:'Demo Person',document_type:'TOR',amount:'100.00',payment_status:'UNPAID',current_status:STATUS.PENDING_FINANCE_VERIFICATION}];
 connection={beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};vi.spyOn(pool,'getConnection').mockResolvedValue(connection);
 vi.spyOn(model,'findByIdForUpdate').mockImplementation(async()=>group);vi.spyOn(model,'findByRequestGroupForUpdate').mockImplementation(async()=>group);vi.spyOn(model,'updatePaymentVerificationForGroup').mockResolvedValue([{affectedRows:1}]);vi.spyOn(assignments,'assertAssignedProcessor').mockResolvedValue();vi.spyOn(logs,'insert').mockResolvedValue();
 vi.spyOn(users,'findById').mockResolvedValue([user]);vi.spyOn(users,'findActiveByStudentId').mockResolvedValue([]);vi.spyOn(users,'findStudentCourseByStudentId').mockResolvedValue([]);vi.spyOn(users,'findSecretaryClerks').mockResolvedValue([]);vi.spyOn(notifications,'notifyInAppBulk').mockResolvedValue();
 vi.spyOn(ledger,'control').mockResolvedValue({active_pack_id:1});vi.spyOn(ledger,'pack').mockResolvedValue({id:1,consumed:0,active:1,pattern:packPattern('DEMO00001').pattern});vi.spyOn(ledger,'retry').mockResolvedValue(null);vi.spyOn(ledger,'current').mockResolvedValue(null);vi.spyOn(ledger,'numberConflict').mockResolvedValue(false);vi.spyOn(ledger,'audit').mockResolvedValue();vi.spyOn(ledger,'group').mockImplementation(async()=>group);
 vi.spyOn(ledger,'insertReceipt').mockImplementation(async data=>({id:3,request_group_id:'DEMO',serial:data.serial,state:'ISSUED',snapshot:data.snapshot}));
});
afterEach(()=>vi.useRealTimers());
it('commits managed issuance and whole-group payment clearance in the same transaction',async()=>{
 const result=await documents.verifyPayment(user,11,body,null);expect(result.receipt.serial).toBe('DEMO00001');expect(ledger.insertReceipt).toHaveBeenCalledWith(expect.objectContaining({client_key:body.client_key}),connection);expect(model.updatePaymentVerificationForGroup).toHaveBeenCalledWith('DEMO',STATUS.PAID_PENDING_SEC_RELEASE,'PAID',expect.objectContaining({orNumber:'DEMO00001',orDate:'2026-10-11'}),connection);expect(connection.commit).toHaveBeenCalledOnce();
});
it('rolls back the allocated serial when payment clearance fails',async()=>{model.updatePaymentVerificationForGroup.mockResolvedValue([{affectedRows:0}]);await expect(documents.verifyPayment(user,11,body,null)).rejects.toThrow('already');expect(connection.rollback).toHaveBeenCalledOnce();expect(connection.commit).not.toHaveBeenCalled();});
it('never issues for Later and refuses a managed issuance/copy mixed payload',async()=>{
 await documents.verifyPayment(user,11,{action:'approve',defer_or:true},null);expect(ledger.insertReceipt).not.toHaveBeenCalled();expect(model.updatePaymentVerificationForGroup).toHaveBeenCalledWith('DEMO',STATUS.PAID_PENDING_SEC_RELEASE,'PAID',expect.objectContaining({orNumber:null}),connection);
 await expect(documents.verifyPayment(user,11,{...body,defer_or:true},null)).rejects.toThrow('Managed issuance');await expect(documents.verifyPayment(user,11,body,{filename:'copy.pdf'})).rejects.toThrow('Managed issuance');
});
it('returns the existing receipt after a lost response and never turns already-cleared deferred payment into a verification retry',async()=>{
 group=[{...group[0],payment_status:'PAID',current_status:STATUS.PAID_PENDING_SEC_RELEASE,or_number:'DEMO00001'}];
 const prior={id:3,request_group_id:'DEMO',serial:'DEMO00001',state:'ISSUED',snapshot:{}};ledger.current.mockResolvedValue(prior);ledger.retry.mockResolvedValue(prior);
 expect((await documents.verifyPayment(user,11,body,null)).receipt).toBe(prior);expect(ledger.insertReceipt).not.toHaveBeenCalled();expect(model.updatePaymentVerificationForGroup).not.toHaveBeenCalled();
 ledger.current.mockResolvedValue(null);await expect(documents.verifyPayment(user,11,body,null)).rejects.toThrow('already cleared');expect(ledger.insertReceipt).not.toHaveBeenCalled();
});
