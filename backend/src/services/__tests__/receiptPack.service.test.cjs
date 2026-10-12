const service=require('../receiptPack.service');
const model=require('../../models/receiptPack.model');
const users=require('../../models/user.model');
const documents=require('../../models/document.model');
const assignments=require('../requestAssignment.service');
const {pool}=require('../../config/db');
const {packPattern}=require('../../utils/receiptSerial');
const {STATUS}=require('../../utils/documentStatus');
const user={id:4,role:'clerk',desk_assignment:'Finance',is_active:1,full_name:'Demo Cashier'};
const body={client_key:'demo-retry-0000000001',expected_pack_id:1,expected_serial:'2026-00001',payor_name:'Person, Demo'};
const group=[{id:11,request_group_id:'DEMO-GROUP',student_id:'DEMO001',student_name:'Demo Person',document_type:'TOR',amount:'100.00',payment_status:'PAID',current_status:STATUS.PAID_PENDING_SEC_RELEASE}];
let connection,pack;
beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T01:00:00Z'));
 connection={beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};
 pack={id:1,active:1,consumed:0,pattern:packPattern('2026-00001',1).pattern};
 vi.spyOn(pool,'getConnection').mockResolvedValue(connection);
 vi.spyOn(users,'findById').mockResolvedValue([user]);vi.spyOn(users,'findActiveByStudentId').mockResolvedValue([]);vi.spyOn(users,'findReceiptName').mockResolvedValue([]);
 vi.spyOn(documents,'findByIdForUpdate').mockResolvedValue(group);vi.spyOn(assignments,'assertAssignedProcessor').mockResolvedValue();
 for(const name of ['audit','activate','publish','voidReceipt','writeGroup','savePrint'])vi.spyOn(model,name).mockResolvedValue(1);
 vi.spyOn(model,'control').mockResolvedValue({active_pack_id:1,version:2});vi.spyOn(model,'pack').mockImplementation(async()=>({...pack}));
 vi.spyOn(model,'retry').mockResolvedValue(null);vi.spyOn(model,'current').mockResolvedValue(null);vi.spyOn(model,'numberConflict').mockResolvedValue(false);vi.spyOn(model,'available').mockResolvedValue(true);vi.spyOn(model,'reserved').mockResolvedValue(false);vi.spyOn(model,'group').mockResolvedValue(group);
 vi.spyOn(model,'insertReceipt').mockImplementation(async data=>{pack.consumed++;return {id:3,request_group_id:data.group,serial:data.serial,pack_id:1,snapshot:data.snapshot,state:'ISSUED'};});
});
afterEach(()=>vi.useRealTimers());
it.each([{role:'student'},{role:'admin'},{role:'clerk',desk_assignment:'Secretary'}])('denies non-Finance receipt operations',async other=>{await expect(service.issue(other,11,body)).rejects.toMatchObject({status:403});expect(pool.getConnection).not.toHaveBeenCalled();});
it('locks control and reads the current pack under lock before allocating one immutable snapshot',async()=>{
 const result=await service.issue(user,11,body);expect(result.serial).toBe('2026-00001');expect(result.snapshot.cashier_name).toBe('Demo Cashier');expect(model.pack).toHaveBeenCalledWith(1,connection,true);expect(model.control).toHaveBeenCalledWith(connection,true);expect(model.insertReceipt).toHaveBeenCalledOnce();expect(connection.commit).toHaveBeenCalledOnce();expect(model.writeGroup).toHaveBeenCalledWith('DEMO-GROUP','2026-00001','2026-10-11',null,connection);
});
it('keeps a successful retry on its existing number and rejects a key belonging to another group',async()=>{
 const prior={id:3,request_group_id:'DEMO-GROUP',serial:'2026-00001',snapshot:{},state:'ISSUED'};model.retry.mockResolvedValue(prior);
 expect(await service.allocate(user,group,connection,body)).toBe(prior);expect(model.insertReceipt).not.toHaveBeenCalled();
 model.retry.mockResolvedValue({...prior,request_group_id:'OTHER'});await expect(service.allocate(user,group,connection,body)).rejects.toThrow('another');
});
it('issues the 50th serial and rejects the 51st without consuming or committing a new receipt',async()=>{
 pack.consumed=49;await service.issue(user,11,{...body,expected_serial:'2026-00050'});expect(pack.consumed).toBe(50);await expect(service.issue(user,11,{...body,client_key:'demo-retry-0000000002',expected_serial:'2026-00051'})).rejects.toThrow('next 50');expect(model.insertReceipt).toHaveBeenCalledOnce();expect(connection.rollback).toHaveBeenCalledOnce();
});
it('rejects a stale displayed number, inactive staff, and inactive staff, while pack replacement preserves an audit without a reason input',async()=>{
 await expect(service.issue(user,11,{...body,expected_serial:'2026-00002'})).rejects.toThrow('changed');expect(model.insertReceipt).not.toHaveBeenCalled();
 await service.configure(user,{start_serial:'2026-00101',end_serial:'2026-00150',version:2});expect(model.audit).toHaveBeenCalledWith('pack_activated',4,expect.objectContaining({archived_unused:50,reason:'Paper pack replaced by Finance; unused serials remain reserved.'}),connection,1);
 model.available.mockResolvedValue(false);await expect(service.configure(user,{start_serial:'2026-00101',end_serial:'2026-00150',version:2,reason:'Damaged remaining paper'})).rejects.toThrow('overlaps');
 users.findById.mockResolvedValue([{...user,is_active:0}]);await expect(service.state(user)).rejects.toMatchObject({status:403});
});
it('archives unused numbers with a structured reason, and cannot reuse a managed number through legacy entry',async()=>{
 await service.configure(user,{start_serial:'2026-00101',end_serial:'2026-00150',version:2,reason:'Damaged paper'});expect(model.audit).toHaveBeenCalledWith('pack_activated',4,expect.objectContaining({archived_unused:50,reason:'Paper pack replaced by Finance; unused serials remain reserved.'}),connection,1);
 model.reserved.mockResolvedValue(true);await expect(service.assertLegacyNumber('2026-00001','A',connection)).rejects.toThrow('managed');
});
it('does not allocate after cutoff or before whole payment clearance',async()=>{
 vi.setSystemTime(new Date('2026-10-11T08:00:00Z'));await expect(service.issue(user,11,body)).rejects.toThrow('cut-off');expect(model.insertReceipt).not.toHaveBeenCalled();
 model.group.mockResolvedValue([{...group[0],payment_status:'UNPAID'}]);await expect(service.issue(user,11,body)).rejects.toThrow('whole payment');
});
it('records print requests/reprints without allocating; retry key prevents a duplicate audit',async()=>{
 const receipt={id:3,serial:'2026-00001',pack_id:1,state:'ISSUED'};vi.spyOn(model,'get').mockResolvedValue(receipt);vi.spyOn(model,'printEvents').mockResolvedValue({prior:false,count:1});
 await service.print(user,3,{client_key:body.client_key,mode:'data-only'});expect(model.audit).toHaveBeenCalledWith('reprint_requested',4,expect.objectContaining({physical_success:'unknown',mode:'data-only'}),connection,1,3);
 model.printEvents.mockResolvedValue({prior:true,count:1});model.audit.mockClear();await service.print(user,3,{client_key:body.client_key});expect(model.audit).not.toHaveBeenCalled();expect(model.insertReceipt).not.toHaveBeenCalled();
});
it('voids before Secretary verification, preserves payment and refuses a finalized request',async()=>{
 const receipt={id:3,request_group_id:'DEMO-GROUP',serial:'2026-00001',pack_id:1,state:'ISSUED'};vi.spyOn(model,'get').mockResolvedValue(receipt);model.group.mockResolvedValue([{...group[0],or_number:receipt.serial}]);
 await service.voidIssued(user,3,{reason:'Printing damaged the paper'});expect(model.writeGroup).toHaveBeenCalledWith('DEMO-GROUP',null,null,null,connection);expect(model.voidReceipt).toHaveBeenCalledOnce();expect(model.insertReceipt).not.toHaveBeenCalled();
 model.group.mockResolvedValue([{...group[0],current_status:STATUS.READY_FOR_RELEASE}]);await expect(service.voidIssued(user,3,{reason:'Wrong'})).rejects.toThrow('before Secretary');
});
it('rolls back issuance if audit storage fails',async()=>{model.audit.mockRejectedValue(new Error('Audit failed'));await expect(service.issue(user,11,body)).rejects.toThrow('Audit failed');expect(connection.commit).not.toHaveBeenCalled();expect(connection.rollback).toHaveBeenCalledOnce();expect(connection.release).toHaveBeenCalledOnce();});
it('serializes competing cashiers at the pack boundary and requires the stale cashier to review the next number',async()=>{
 // Promise-based lock simulation needs no real timer; retain the controlled
 // business-hours clock so this regression also runs after the OR cutoff.
 let held=null,tail=Promise.resolve();
 model.control.mockImplementation(async(executor,lock)=>{if(lock&&held!==executor){const previous=tail;let release;tail=new Promise(resolve=>release=resolve);await previous;held=executor;executor.releaseLock=()=>{held=null;release();};}return {active_pack_id:1,version:2};});
 pool.getConnection.mockImplementation(async()=>({beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release(){this.releaseLock?.();}}));
 pack.consumed=48;const otherGroup=[{...group[0],id:12,request_group_id:'DEMO-OTHER'}];documents.findByIdForUpdate.mockImplementation(async id=>id===11?group:otherGroup);model.group.mockImplementation(async id=>id==='DEMO-GROUP'?group:otherGroup);
 const pair=await Promise.allSettled([service.issue(user,11,{...body,expected_serial:'2026-00049'}),service.issue(user,12,{...body,client_key:'demo-retry-0000000002',expected_serial:'2026-00049'})]);
 expect(pair.filter(value=>value.status==='fulfilled')).toHaveLength(1);expect(pair.filter(value=>value.status==='rejected')[0].reason.message).toContain('changed');expect(pack.consumed).toBe(49);
 await service.issue(user,12,{...body,client_key:'demo-retry-0000000002',expected_serial:'2026-00050'});expect(pack.consumed).toBe(50);expect(model.insertReceipt.mock.calls.map(([data])=>data.serial)).toEqual(['2026-00049','2026-00050']);
});
it('rejects file signature mismatches and preserves an exact receipt upload without consuming another number',async()=>{
 const fs=require('fs/promises'),os=require('os'),path=require('path');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'trace-receipt-test-'));const file={path:path.join(dir,'demo.pdf'),filename:'synthetic-demo.pdf',size:12,mimetype:'application/pdf'};
 try{
  await fs.writeFile(file.path,'Not a PDF');await expect(service.validateFile(file)).rejects.toThrow('content');await fs.writeFile(file.path,'%PDF-1.4 demo');
  const receipt={id:3,request_group_id:'DEMO-GROUP',serial:'2026-00001',pack_id:1,state:'ISSUED',snapshot:{issue_date:'2026-10-11'}};vi.spyOn(model,'get').mockResolvedValue(receipt);model.group.mockResolvedValue([{...group[0],or_number:receipt.serial}]);
  expect(await service.upload(user,3,file)).toMatchObject({success:true,copy_path:'/uploads/synthetic-demo.pdf'});expect(model.insertReceipt).not.toHaveBeenCalled();expect(model.publish).toHaveBeenCalledWith(3,'/uploads/synthetic-demo.pdf',connection);
  model.get.mockResolvedValue({...receipt,copy_path:'/uploads/already.pdf'});await expect(service.upload(user,3,file)).rejects.toThrow('already has a copy');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

it('uses the saved student name parts and ignores a supplied payor override',async()=>{
 users.findReceiptName.mockResolvedValue([{full_name:'Demo Maria De la Cruz',first_name:'Demo',middle_name:'Maria',last_name:'De la Cruz'}]);
 model.group.mockResolvedValue([{...group[0],student_name:'Demo Maria De la Cruz'}]);
 const result=await service.issue(user,11,{...body,payor_name:'Another Person'});
 expect(result.snapshot.payor_name).toBe('De la Cruz, Demo M.');
 expect(result.snapshot.saved_student_name).toBe('Demo Maria De la Cruz');
});
it('rejects a range that does not contain exactly fifty paper numbers without archiving the old pack',async()=>{
 await expect(service.configure(user,{start_serial:'2026-00101',end_serial:'2026-00149',version:2})).rejects.toThrow('exactly 50');
 expect(model.activate).not.toHaveBeenCalled();expect(model.audit).not.toHaveBeenCalled();
});
