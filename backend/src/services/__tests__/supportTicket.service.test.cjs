const model=require('../../models/supportTicket.model');
const documents=require('../../models/document.model');
const users=require('../../models/user.model');
const notifications=require('../notification.service');
const desks=require('../../models/documentMessage.model');
const {pool}=require('../../config/db');
const service=require('../supportTicket.service');
const {DEFAULTS}=require('../../utils/supportHours');
const student={id:3,role:'student',is_active:1,email_verified_at:new Date(),full_name:'Synthetic student'};
const clerk={id:4,role:'clerk',desk_assignment:'Window 1',is_active:1};
const ticket={id:11,student_user_id:3,student_id:'SYNTHETIC-3',category:'general',document_id:null,state:'FAQ_ASSISTANCE'};
const key='synthetic-retry-key-0001';
let tx;
beforeEach(()=>{
 tx={query:vi.fn(),beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};
 vi.spyOn(pool,'getConnection').mockResolvedValue(tx);
 vi.spyOn(model,'actor').mockResolvedValue(student);
 vi.spyOn(model,'settings').mockResolvedValue(DEFAULTS);
 vi.spyOn(model,'ticket').mockImplementation(async()=>({...ticket}));
 for(const name of ['openGeneral','linked','eventExists','priorSend','currentAssignment','oldest'])vi.spyOn(model,name).mockResolvedValue(null);
 for(const name of ['update','event','system','availability','saveSettings','file'])vi.spyOn(model,name).mockResolvedValue([]);
 vi.spyOn(model,'create').mockResolvedValue(11);
 vi.spyOn(model,'send').mockResolvedValue(21);
 vi.spyOn(model,'files').mockResolvedValue([]);
 vi.spyOn(require('../../models/requestAttachment.model'),'list').mockResolvedValue([]);
 vi.spyOn(require('../../models/requestAttachment.model'),'bubble').mockResolvedValue([]);
 vi.spyOn(users,'findStudentForPolicy').mockResolvedValue([{id:3}]);
 vi.spyOn(model,'history').mockResolvedValue({messages:[],next_cursor:null});
 vi.spyOn(model,'list').mockResolvedValue({tickets:[ticket],next_cursor:null});
 vi.spyOn(model,'available').mockResolvedValue(true);
 vi.spyOn(model,'queueInfo').mockResolvedValue({position:1,available_clerks:0,episodes:[]});
 vi.spyOn(desks,'window1Recipients').mockResolvedValue([clerk]);
 vi.spyOn(notifications,'notifyInAppBulk').mockResolvedValue(undefined);
 vi.spyOn(users,'findStudentIdById').mockResolvedValue([{student_id:'SYNTHETIC-3'}]);
 vi.spyOn(users,'findCourseById').mockResolvedValue([{college_id:1,course:'Synthetic college'}]);
 vi.spyOn(users,'findStudentCourseByStudentId').mockResolvedValue([{college_id:1,course:'Synthetic college'}]);
 vi.spyOn(documents,'findByIdForUpdate').mockResolvedValue([{id:7,student_id:'SYNTHETIC-3',current_status:'SEC_PROCESSING'}]);
});
it('locks the owner and returns an existing general ticket without a second insert',async()=>{
 model.openGeneral.mockResolvedValue({id:11});
 await service.create(student,{subject:'Help',client_key:key});
 expect(model.actor).toHaveBeenCalledWith(3,tx,true);expect(model.create).not.toHaveBeenCalled();expect(tx.commit).toHaveBeenCalledOnce();
});
it('creates FAQ assistance before escalation with a durable event',async()=>{
 await service.create(student,{subject:'Help',client_key:key});
 expect(model.create).toHaveBeenCalledWith(3,null,'Help','general',tx);expect(model.event).toHaveBeenCalledWith(11,3,'created',`3:${key}`,expect.objectContaining({hash:expect.any(String)}),tx);
});
it('rejects unauthorized linked-case creation before any ticket write',async()=>{
 users.findStudentIdById.mockResolvedValue([{student_id:'OTHER'}]);
 await expect(service.create(student,{subject:'Help',document_id:7,client_key:key})).rejects.toMatchObject({status:403});expect(model.create).not.toHaveBeenCalled();
});
it('keeps general assistance available but requires email ownership for a linked case',async()=>{
 model.actor.mockResolvedValue({...student,email_verified_at:null});
 await expect(service.create(student,{subject:'Help',document_id:7,client_key:key})).rejects.toMatchObject({status:403});
 await expect(service.create(student,{subject:'Help',client_key:key})).resolves.toMatchObject({id:11});
});
it.each(['COMPLETED','APPROVED','REJECTED','unknown'])('rejects new linked ticket for %s',async current_status=>{
 documents.findByIdForUpdate.mockResolvedValue([{id:7,student_id:'SYNTHETIC-3',current_status}]);
 await expect(service.create(student,{subject:'Help',document_id:7,client_key:key})).rejects.toMatchObject({status:400});expect(model.create).not.toHaveBeenCalled();
});
it('denies wrong-student reads before history retrieval',async()=>{
 model.ticket.mockResolvedValue({...ticket,student_user_id:8});
 await expect(service.read(student,11)).rejects.toMatchObject({status:403});expect(model.history).not.toHaveBeenCalled();
});
it.each(['Finance','Secretary'])('denies %s access to a general ticket',async desk_assignment=>{
 const actor={...clerk,desk_assignment};model.actor.mockResolvedValue(actor);
 await expect(service.read(actor,11)).rejects.toMatchObject({status:403});
});
it('rechecks the Secretary assigned college for linked history',async()=>{
 const actor={...clerk,desk_assignment:'Secretary'};model.actor.mockResolvedValue(actor);
 model.ticket.mockResolvedValue({...ticket,document_id:7,category:'linked',current_status:'SEC_PROCESSING'});
 users.findStudentCourseByStudentId.mockResolvedValue([{college_id:2}]);
 await expect(service.read(actor,11)).rejects.toMatchObject({status:403});expect(model.history).not.toHaveBeenCalled();
});
it('permits Finance linked read access without general access or management',async()=>{
 const actor={...clerk,desk_assignment:'Finance'};model.actor.mockResolvedValue(actor);
 model.ticket.mockResolvedValue({...ticket,document_id:7,category:'linked',state:'IN_PROGRESS',current_status:'SEC_PROCESSING'});
 await expect(service.read(actor,11)).resolves.toMatchObject({ticket:{id:11}});
 await expect(service.action(actor,11,{action:'resolve',client_key:key})).rejects.toMatchObject({status:403});
});
it('retains a resolved/cancelled linked ticket as read-only history',async()=>{
 model.ticket.mockResolvedValue({...ticket,category:'linked',document_id:null});
 await expect(service.read(student,11)).resolves.toMatchObject({ticket:{read_only:true}});
 await expect(service.send(student,11,{message:'Hello',client_key:key})).rejects.toMatchObject({status:400});expect(model.send).not.toHaveBeenCalled();
});
it('records an accepted send and escalates explicit live-support phrases on the same ticket',async()=>{
 await service.send(student,11,{message:'I want live support',client_key:key});
 expect(model.send).toHaveBeenCalledWith(11,3,'I want live support',key,expect.any(String),tx);
 expect(model.update).toHaveBeenCalledWith(11,expect.objectContaining({state:'QUEUED'}),tx);
 expect(model.event).toHaveBeenCalledWith(11,3,'escalated',expect.any(String),expect.objectContaining({via:'explicit_phrase'}),tx);
});
it('requeues a returning student rather than reclaiming a busy clerk',async()=>{
 model.ticket.mockResolvedValue({...ticket,state:'AWAITING_STUDENT'});
 await service.send(student,11,{message:'I am back',client_key:key});
 expect(model.update).toHaveBeenCalledWith(11,expect.objectContaining({state:'QUEUED',assigned_to:null,queued_at:expect.any(Date)}),tx);expect(model.oldest).not.toHaveBeenCalled();
});
it('rejects a retry key belonging to another ticket without sending',async()=>{
 model.priorSend.mockResolvedValue({id:21,ticket_id:99,payload_hash:'wrong'});
 await expect(service.send(student,11,{message:'Hello',client_key:key})).rejects.toMatchObject({status:400});expect(model.send).not.toHaveBeenCalled();expect(tx.rollback).toHaveBeenCalledOnce();
});
it('keeps committed sends accepted despite a notification failure',async()=>{
 notifications.notifyInAppBulk.mockRejectedValue(new Error('Synthetic unavailable'));
 await expect(service.send(student,11,{message:'Hello',client_key:key})).resolves.toMatchObject({sent:{id:21}});expect(tx.rollback).not.toHaveBeenCalled();
});
it('returns an existing live assignment without claiming another ticket',async()=>{
 model.actor.mockResolvedValue(clerk);model.currentAssignment.mockResolvedValue({id:11});
 await service.claim(clerk);expect(model.oldest).not.toHaveBeenCalled();expect(model.update).not.toHaveBeenCalled();
});
it('requires explicit availability and open hours for a first claim',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-05T02:00:00Z'));model.actor.mockResolvedValue(clerk);model.available.mockResolvedValue(false);
 try { await expect(service.claim(clerk)).rejects.toMatchObject({status:400});expect(model.oldest).not.toHaveBeenCalled(); }
 finally{vi.useRealTimers();}
});
it('allows Window 1 settings management and denies student settings changes',async()=>{
 await expect(service.saveSettings(student,DEFAULTS)).rejects.toMatchObject({status:403});
 model.actor.mockResolvedValue(clerk);await service.saveSettings(clerk,DEFAULTS);
 expect(model.saveSettings).toHaveBeenCalledWith(DEFAULTS,4,tx);
});
it('warns exactly once and times out only an explicit student-reply clock',async()=>{
 const live={...ticket,state:'IN_PROGRESS',assigned_to:4,reply_requested_at:new Date('2026-10-05T00:00:00Z'),reply_clock:DEFAULTS};
 await service.settleTicket(live,tx,DEFAULTS,new Date('2026-10-05T00:03:00Z'));
 await service.settleTicket(live,tx,DEFAULTS,new Date('2026-10-05T00:04:00Z'));
 expect(model.event.mock.calls.filter(call=>call[2]==='response_warning')).toHaveLength(1);
 await service.settleTicket(live,tx,DEFAULTS,new Date('2026-10-05T00:05:00Z'));
 expect(live).toMatchObject({state:'AWAITING_STUDENT',assigned_to:null,reply_requested_at:null});
 expect(model.event.mock.calls.filter(call=>call[2]==='response_timeout')).toHaveLength(1);
});
it('does not time out a student waiting on a clerk or during closed hours',async()=>{
 await service.settleTicket({...ticket,state:'IN_PROGRESS'},tx,DEFAULTS,new Date());
 await service.settleTicket({...ticket,state:'IN_PROGRESS',reply_requested_at:new Date('2026-10-08T07:59:00Z'),reply_clock:DEFAULTS},tx,DEFAULTS,new Date('2026-10-11T07:00:00Z'));
 expect(model.update).not.toHaveBeenCalled();
});
it('returns an accepted send retry even after the ticket resolves, without a second write',async()=>{
 const text='Accepted message',hash=require('crypto').createHash('sha256').update(JSON.stringify({text,files:[]})).digest('hex');
 model.ticket.mockResolvedValue({...ticket,state:'RESOLVED'});model.priorSend.mockResolvedValue({id:21,ticket_id:11,payload_hash:hash});
 await expect(service.assertSendAccess(student,11)).resolves.toMatchObject({state:'RESOLVED'});
 await expect(service.send(student,11,{message:text,client_key:key})).resolves.toMatchObject({sent:{id:21},duplicate:true});
 expect(model.send).not.toHaveBeenCalled();expect(notifications.notifyInAppBulk).not.toHaveBeenCalled();
});
it('does not notify the owner again for a duplicate claim',async()=>{
 model.actor.mockResolvedValue(clerk);model.currentAssignment.mockResolvedValue({id:11});
 await service.claim(clerk);expect(notifications.notifyInAppBulk).not.toHaveBeenCalled();
});
it('pauses Window 1 live replies outside server-calendar hours without freeing the assignment',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
 model.actor.mockResolvedValue(clerk);model.ticket.mockResolvedValue({...ticket,state:'IN_PROGRESS',assigned_to:4});
 try{await expect(service.send(clerk,11,{message:'Outside hours',client_key:key})).rejects.toMatchObject({status:400});expect(model.send).not.toHaveBeenCalled();expect(model.update).not.toHaveBeenCalled();}
 finally{vi.useRealTimers();}
});
