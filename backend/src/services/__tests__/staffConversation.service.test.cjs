const reads = require('../../models/conversationRead.model');
const service = require('../staffConversation.service');
const model = require('../../models/staffConversation.model');
const notifications = require('../notification.service');
const {pool} = require('../../config/db');
const finance={id:4,role:'clerk',desk_assignment:'Finance',is_active:1,full_name:'Demo Cashier'};
const window1={id:7,role:'clerk',desk_assignment:'Window 1',is_active:1,full_name:'Demo Registrar'};
const admin={id:9,role:'admin',is_active:1,full_name:'Demo Admin'};
const secretary={id:12,role:'clerk',desk_assignment:'Secretary',is_active:1,resolved_college_id:2,full_name:'Demo Secretary'};
const input={recipient_id:7,message:'Please coordinate the demo handoff.',client_key:'demo-staff-chat-key-0001'};
let tx,thread,accounts;
beforeEach(()=>{
 vi.spyOn(reads,'withUnread').mockImplementation(async(_channel,_actor,rows)=>rows.map(row=>({...row,unread_count:2})));
 vi.spyOn(reads,'mark').mockResolvedValue({read_through:31});
  tx={query:vi.fn(),beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};
  accounts=[finance,window1,admin,secretary];
  thread={id:21,participant_low:4,participant_high:7,scope_college_id:0,low_name:finance.full_name,high_name:window1.full_name,low_role:'clerk',high_role:'clerk',low_desk:'Finance',high_desk:'Window 1',low_active:1,high_active:1};
  vi.spyOn(pool,'getConnection').mockResolvedValue(tx);
  vi.spyOn(model,'actors').mockImplementation(async ids=>accounts.filter(row=>ids.includes(row.id)));
  vi.spyOn(model,'conversation').mockImplementation(async()=>({...thread}));
  vi.spyOn(model,'list').mockResolvedValue({conversations:[thread],next_cursor:null});
  vi.spyOn(model,'recipients').mockResolvedValue({recipients:[window1],next_cursor:null});
  vi.spyOn(model,'history').mockResolvedValue({messages:[],next_cursor:null});
  vi.spyOn(model,'pair').mockResolvedValue(null);vi.spyOn(model,'create').mockResolvedValue(21);
  vi.spyOn(model,'message').mockResolvedValue(31);vi.spyOn(model,'event').mockResolvedValue([]);vi.spyOn(model,'prior').mockResolvedValue(null);
  vi.spyOn(notifications,'notifyInAppBulk').mockResolvedValue(undefined);
});
it.each([{...finance,is_active:0},{...finance,role:'student'},{...finance,desk_assignment:'Other'},{...secretary,id:4,resolved_college_id:null}])('rejects stale/ineligible actors on every operation',async account=>{
  accounts=[account,window1];
  for(const call of [()=>service.recipients(finance),()=>service.list(finance),()=>service.read(finance,21),()=>service.open(finance,input),()=>service.send(finance,21,input)])await expect(call()).rejects.toMatchObject({status:403});
  expect(model.history).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();
});
it('permits active Admin monitoring while denying all recipient/open/send operations',async()=>{
  expect((await service.list(admin)).conversations[0]).toMatchObject({monitor_only:true,can_send:false});
  await expect(service.read(admin,21)).resolves.toMatchObject({conversation:{can_send:false}});
  for(const call of [()=>service.recipients(admin),()=>service.open(admin,input),()=>service.send(admin,21,input)])await expect(call()).rejects.toMatchObject({status:403});
  expect(model.message).not.toHaveBeenCalled();
});
it.each(['read','send'])('denies an unrelated staff account before %s history or messages',async operation=>{
  const call=operation==='read'?service.read(secretary,21):service.send(secretary,21,input);
  await expect(call).rejects.toMatchObject({status:403});expect(model.history).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();
});
it.each([{...window1,role:'student'},{...window1,role:'admin'},{...window1,is_active:0},{...window1,desk_assignment:'Other'}])('rejects manipulated or unavailable recipients',async recipient=>{
  accounts=[finance,recipient];await expect(service.open(finance,input)).rejects.toMatchObject({status:403});expect(model.create).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();expect(tx.rollback).toHaveBeenCalled();
});
it('rejects self-chat and ignores client-supplied ownership, scope and student links',async()=>{
  await expect(service.open(finance,{...input,recipient_id:4})).rejects.toMatchObject({status:400});
  await service.open(finance,{...input,participant_low:99,scope_college_id:88,document_id:77,student_user_id:66});
  expect(model.create).toHaveBeenCalledWith(4,7,0,tx);expect(model.actors).toHaveBeenCalledWith([7,4],tx,true);
  expect(notifications.notifyInAppBulk).toHaveBeenCalledWith([{id:7}],expect.objectContaining({message:'Staff conversation #21 has a new message.',actionUrl:'/dashboard?tab=messages&category=staff&conversation=21'}));
});
it('reuses the same pair conversation and inserts only the intended first message',async()=>{
  model.pair.mockResolvedValue({id:21});await service.open(finance,input);
  expect(model.create).not.toHaveBeenCalled();expect(model.message).toHaveBeenCalledOnce();expect(tx.commit).toHaveBeenCalledOnce();
});
it('serializes two simultaneous opposite-direction opens into one pair conversation',async()=>{
  let tail=Promise.resolve(),pair=null;
  pool.getConnection.mockImplementation(async()=>({query:vi.fn(),beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release(){this.unlock?.();}}));
  model.actors.mockImplementation(async(ids,executor,lock)=>{
    if(lock){const previous=tail;tail=new Promise(resolve=>{executor.unlock=resolve;});await previous;}
    return accounts.filter(row=>ids.includes(row.id));
  });
  model.pair.mockImplementation(async()=>pair);model.create.mockImplementation(async()=>{pair={id:21};return 21;});
  await Promise.all([service.open(finance,input),service.open(window1,{...input,recipient_id:4,client_key:'demo-opposite-open-0002'})]);
  expect(model.create).toHaveBeenCalledOnce();expect(model.message).toHaveBeenCalledTimes(2);expect(model.event).toHaveBeenCalledTimes(2);
});
it('limits Secretary pairs to the same college and snapshots the college with global desks',async()=>{
  accounts.push({...secretary,id:14,resolved_college_id:3});
  await expect(service.open(secretary,{...input,recipient_id:14})).rejects.toMatchObject({status:403});
  accounts.push({...secretary,id:15});await service.open(secretary,{...input,recipient_id:15});expect(model.create).toHaveBeenLastCalledWith(12,15,2,tx);
  await service.open(finance,{...input,recipient_id:12});expect(model.create).toHaveBeenLastCalledWith(4,12,2,tx);
});
it('denies history after a Secretary changes college assignment',async()=>{
  thread={...thread,participant_high:12,scope_college_id:3};await expect(service.read(secretary,21)).rejects.toMatchObject({status:403});expect(model.history).not.toHaveBeenCalled();
});
it('returns retained read-only participant history after another participant is deactivated or moves college',async()=>{
  thread.high_active=0;expect((await service.read(finance,21)).conversation.can_send).toBe(false);
  await expect(service.send(finance,21,input)).rejects.toMatchObject({status:403});
  thread={...thread,high_active:1,high_desk:'Secretary',high_college_id:3,scope_college_id:2};await expect(service.send(finance,21,input)).rejects.toMatchObject({status:403});
  expect(model.message).not.toHaveBeenCalled();
});
it('checks the fresh locked actor again when a role is revoked between reads and writes',async()=>{
  model.actors.mockImplementation(async(ids,executor,lock)=>accounts.filter(row=>ids.includes(row.id)).map(row=>lock&&row.id===4?{...row,is_active:0}:row));
  await expect(service.send(finance,21,input)).rejects.toMatchObject({status:403});expect(model.message).not.toHaveBeenCalled();
});
it('replays accepted opens and sends without another message or notification',async()=>{
  await service.open(finance,input);const hash=model.event.mock.calls[0][4];
  model.prior.mockResolvedValue({conversation_id:21,event_type:'opened',payload_hash:hash,message_id:31});
  await expect(service.open(finance,input)).resolves.toMatchObject({duplicate:true,message_id:31});expect(model.message).toHaveBeenCalledOnce();
  model.prior.mockResolvedValue(null);await service.send(finance,21,input);const sendHash=model.event.mock.calls.at(-1)[4];
  model.prior.mockResolvedValue({conversation_id:21,event_type:'message',payload_hash:sendHash,message_id:32});thread.high_active=0;
  await expect(service.send(finance,21,input)).resolves.toMatchObject({duplicate:true,message_id:32});expect(model.message).toHaveBeenCalledTimes(2);expect(notifications.notifyInAppBulk).toHaveBeenCalledTimes(2);
});
it('rejects key reuse across messages and conversations',async()=>{
  await service.send(finance,21,input);const hash=model.event.mock.calls[0][4];
  model.prior.mockResolvedValue({conversation_id:21,event_type:'message',payload_hash:hash,message_id:31});
  await expect(service.send(finance,21,{...input,message:'Changed payload'})).rejects.toMatchObject({status:400});
  await expect(service.send(finance,22,input)).rejects.toMatchObject({status:400});expect(model.message).toHaveBeenCalledOnce();
});
it('rolls back failed audit writes and never notifies uncommitted messages',async()=>{
  model.event.mockRejectedValue(new Error('storage failed'));await expect(service.send(finance,21,input)).rejects.toThrow('storage failed');expect(tx.rollback).toHaveBeenCalledOnce();expect(tx.commit).not.toHaveBeenCalled();expect(notifications.notifyInAppBulk).not.toHaveBeenCalled();
});
it('retains a committed message when notifications fail and bounds deadlock retry',async()=>{
  notifications.notifyInAppBulk.mockRejectedValue(new Error('offline'));await expect(service.send(finance,21,input)).resolves.toMatchObject({message_id:31});
  model.event.mockRejectedValue({code:'ER_LOCK_DEADLOCK'});await expect(service.send(finance,21,input)).rejects.toMatchObject({code:'ER_LOCK_DEADLOCK'});expect(model.event).toHaveBeenCalledTimes(4);
});
it('filters recipient projections and forwards bounded cursors without exposing private profile fields',async()=>{
  model.recipients.mockResolvedValue({recipients:[{...window1,email:'private@example.test',password_hash:'hidden'},{...window1,id:99,role:'admin'}],next_cursor:7});
  const result=await service.recipients(finance,{search:'Window',before:'19'});expect(result.recipients).toEqual([{id:7,full_name:window1.full_name,desk_assignment:'Window 1',college_name:undefined}]);
  expect(model.recipients).toHaveBeenCalledWith(finance,'Window',19);
});
it.each([null,[],{}, {message:'',client_key:input.client_key},{message:'x'.repeat(2001),client_key:input.client_key},{message:'Demo',client_key:'bad'}])('rejects malformed message payloads',async body=>{await expect(service.open(finance,body)).rejects.toMatchObject({status:400});expect(model.message).not.toHaveBeenCalled();});
it.each([true,'1 OR 1=1',-1,'0','1.5'])('rejects invalid conversation identifiers',async value=>{await expect(service.read(finance,value)).rejects.toMatchObject({status:400});});

it('authorizes per-user read receipts before writing and preserves unread list values',async()=>{
 await service.markRead(finance,21,{through:31});expect(reads.mark).toHaveBeenCalledWith('staff',finance.id,expect.any(Number),31);
 reads.mark.mockClear();await expect(service.markRead({...window1,id:99},21,{through:31})).rejects.toMatchObject({status:403});expect(reads.mark).not.toHaveBeenCalled();
});
