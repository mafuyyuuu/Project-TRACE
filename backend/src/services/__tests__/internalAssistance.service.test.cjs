const reads = require('../../models/conversationRead.model');
const service = require('../internalAssistance.service');
const model = require('../../models/internalAssistance.model');
const notification = require('../notification.service');
const {pool} = require('../../config/db');
const staff = {id:4,role:'clerk',desk_assignment:'Finance',is_active:1,full_name:'Demo Cashier'};
const admin = {id:9,role:'admin',is_active:1,full_name:'Demo Admin'};
const retryKey = 'demo-internal-action-0001';
const creation = {subject:'Print alignment',category:'system_issue',description:'Please review the demo print configuration.',client_key:retryKey};
let tx,ticket;
beforeEach(() => {
 vi.spyOn(reads,'withUnread').mockImplementation(async(_channel,_actor,rows)=>rows.map(row=>({...row,unread_count:2})));
 vi.spyOn(reads,'mark').mockResolvedValue({read_through:31});
  tx = {query:vi.fn(),beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};
  ticket = {id:11,created_by:4,creator_desk:'Finance',subject:'Print alignment',category:'system_issue',state:'QUEUED',version:0,assigned_to:null};
  vi.spyOn(pool,'getConnection').mockResolvedValue(tx);
  vi.spyOn(model,'actor').mockImplementation(async id => id === 9 ? admin : staff);
  vi.spyOn(model,'ticket').mockImplementation(async () => ({...ticket}));
  vi.spyOn(model,'list').mockResolvedValue({tickets:[ticket],next_cursor:null});
  vi.spyOn(model,'history').mockResolvedValue({messages:[],next_cursor:null});
  vi.spyOn(model,'prior').mockResolvedValue(null);
  vi.spyOn(model,'create').mockResolvedValue(11);
  vi.spyOn(model,'message').mockResolvedValue(21);
  vi.spyOn(model,'event').mockResolvedValue([]);
  vi.spyOn(model,'update').mockImplementation(async (id,values) => {Object.assign(ticket,values);ticket.version++;});
  vi.spyOn(model,'admins').mockResolvedValue([{id:9},{id:10}]);
  vi.spyOn(notification,'notifyInAppBulk').mockResolvedValue(undefined);
});
it.each([{id:1,role:'student',is_active:1},{...staff,desk_assignment:'Other'},{...staff,is_active:0},{...staff,role:'admin'}])('rejects disallowed/stale actors on every operation',async actor => {
  model.actor.mockResolvedValue(actor);
  const user = {...actor,role:actor.role === 'admin' ? 'clerk' : actor.role};
  for (const run of [() => service.list(user),() => service.read(user,11),() => service.create(user,creation),() => service.send(user,11,{message:'Hello',client_key:retryKey}),() => service.action(user,11,{action:'claim',version:0,client_key:retryKey})]) {
    await expect(run()).rejects.toMatchObject({status:403});
  }
  expect(model.history).not.toHaveBeenCalled();expect(model.create).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();
});
it.each(['Window 1','Receiving Desk','Secretary','Finance'])('allows %s to create only its own private concern',async desk_assignment => {
  model.actor.mockResolvedValue({...staff,desk_assignment});
  await expect(service.create(staff,{...creation,created_by:99,student_user_id:88,document_id:7,assigned_to:9})).resolves.toMatchObject({ticket:{id:11},duplicate:false});
  expect(model.create).toHaveBeenCalledWith(expect.objectContaining({id:4,desk_assignment}),creation.subject,'system_issue',tx);
  expect(model.actor).toHaveBeenCalledWith(4,tx,true);expect(tx.commit).toHaveBeenCalledOnce();
  expect(notification.notifyInAppBulk).toHaveBeenCalledWith([{id:9},{id:10}],expect.objectContaining({actionUrl:'/dashboard?tab=internal-assistance&internalTicket=11',message:'Internal ticket #11 has an update.'}));
});
it('scopes staff lists to the creator and Admin lists to the separate queue',async () => {
  await service.list(staff,{state:'RESOLVED',category:'other',before:'25'});
  expect(model.list).toHaveBeenCalledWith(4,{view:'all',state:'RESOLVED',category:'other',before:25});
  await service.list(admin);
  expect(model.list).toHaveBeenLastCalledWith(null,{view:'all',state:undefined,category:undefined,before:null});
});
it.each(['read','send','action'])('rejects another staff creator before %s history or mutation',async operation => {
  ticket.created_by = 99;
  const run = operation === 'read' ? service.read(staff,11) : operation === 'send' ? service.send(staff,11,{message:'Hi',client_key:retryKey}) : service.action(staff,11,{action:'reopen',version:0,client_key:retryKey});
  await expect(run).rejects.toMatchObject({status:403});expect(model.history).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();expect(model.update).not.toHaveBeenCalled();
});
it('keeps Admin creation and unassigned replies unavailable',async () => {
  await expect(service.create(admin,creation)).rejects.toMatchObject({status:403});
  await expect(service.send(admin,11,{message:'Hello',client_key:retryKey})).rejects.toMatchObject({status:403});
  expect(model.create).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();
});
it('claims under a ticket lock and retains responsible Admin on staff return',async () => {
  await service.action(admin,11,{action:'claim',version:0,client_key:retryKey});
  expect(model.ticket).toHaveBeenCalledWith(11,tx,true);expect(ticket).toMatchObject({state:'IN_PROGRESS',assigned_to:9,version:1});
  ticket.admin_active = 1;ticket.assigned_role = 'admin';
  await service.action(admin,11,{action:'await_staff',version:1,client_key:'demo-internal-await-0001'});
  await service.send(staff,11,{message:'Here is the detail.',client_key:'demo-internal-reply-0001'});
  expect(ticket).toMatchObject({state:'IN_PROGRESS',assigned_to:9,version:3});
  expect(notification.notifyInAppBulk).toHaveBeenLastCalledWith([{id:9}],expect.objectContaining({title:'Internal assistance updated'}));
});
it('rejects a second Admin claim after the first has changed the version',async () => {
  await service.action(admin,11,{action:'claim',version:0,client_key:retryKey});
  const other = {...admin,id:10};model.actor.mockResolvedValue(other);ticket.admin_active=1;ticket.assigned_role='admin';
  await expect(service.action(other,11,{action:'claim',version:0,client_key:'demo-second-admin-0001'})).rejects.toMatchObject({status:409});
  expect(model.update).toHaveBeenCalledOnce();
  await expect(service.action(other,11,{action:'claim',version:1,client_key:'demo-second-admin-0002'})).rejects.toMatchObject({status:403});
});
it('permits explicit takeover from an inactive assigned Admin',async () => {
  Object.assign(ticket,{assigned_to:10,admin_active:0,assigned_role:'admin',state:'AWAITING_STAFF'});
  await service.action(admin,11,{action:'claim',version:0,client_key:retryKey});
  expect(ticket).toMatchObject({assigned_to:9,state:'IN_PROGRESS'});
  expect(model.event).toHaveBeenCalledWith(11,9,'claim',retryKey,expect.any(String),21,expect.objectContaining({previous_assignee:10}),tx);
});
it('arbitrates simultaneous Admin claims with the ticket lock and stale-version guard',async () => {
  let tail = Promise.resolve();
  pool.getConnection.mockImplementation(async () => ({query:vi.fn(),beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release(){this.releaseLock?.();}}));
  model.actor.mockImplementation(async id => ({...admin,id}));
  model.ticket.mockImplementation(async (_id,executor,lock) => {
    if (lock) {const previous=tail;tail=new Promise(resolve => {executor.releaseLock=resolve;});await previous;}
    return {...ticket};
  });
  const results=await Promise.allSettled([
    service.action(admin,11,{action:'claim',version:0,client_key:retryKey}),
    service.action({...admin,id:10},11,{action:'claim',version:0,client_key:'demo-competing-admin-0001'}),
  ]);
  expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(row => row.status === 'rejected').reason).toMatchObject({status:409});
  expect(model.update).toHaveBeenCalledOnce();expect(ticket.version).toBe(1);
});
it.each(['await_staff','resume','resolve'])('requires the assigned Admin for %s',async action => {
  Object.assign(ticket,{assigned_to:10,state:'IN_PROGRESS'});
  await expect(service.action(admin,11,{action,version:0,note:'Completed',client_key:retryKey})).rejects.toMatchObject({status:403});
  await expect(service.action(staff,11,{action,version:0,note:'Completed',client_key:retryKey})).rejects.toMatchObject({status:403});
});
it('requires a resolution note and rejects a stale resolution after a new message',async () => {
  Object.assign(ticket,{assigned_to:9,state:'IN_PROGRESS'});
  await expect(service.action(admin,11,{action:'resolve',version:0,note:' ',client_key:retryKey})).rejects.toMatchObject({status:400});
  await service.send(staff,11,{message:'Another detail',client_key:retryKey});
  await expect(service.action(admin,11,{action:'resolve',version:0,note:'Completed',client_key:'demo-resolution-0001'})).rejects.toMatchObject({status:409});
});
it('retains resolution history, disables sends and reopens at the internal queue',async () => {
  Object.assign(ticket,{assigned_to:9,state:'IN_PROGRESS'});
  await service.action(admin,11,{action:'resolve',version:0,note:'Demo settings corrected.',client_key:retryKey});
  expect(ticket).toMatchObject({state:'RESOLVED',assigned_to:9,resolved_at:expect.any(Date)});
  expect(model.message).toHaveBeenCalledWith(11,null,'Resolved by Demo Admin.\n\nDemo settings corrected.','system',tx);
  await expect(service.send(staff,11,{message:'Hi',client_key:'demo-new-message-0001'})).rejects.toMatchObject({status:400});
  await service.action(staff,11,{action:'reopen',version:1,client_key:'demo-reopen-action-0001'});
  expect(ticket).toMatchObject({state:'QUEUED',assigned_to:null,resolved_at:null,version:2});
});
it('acknowledges creation/action/send retries without repeating writes, even after resolution',async () => {
  await service.create(staff,creation);const creationHash=model.event.mock.calls[0][4];
  model.prior.mockResolvedValue({ticket_id:11,event_type:'created',payload_hash:creationHash});
  await expect(service.create(staff,creation)).resolves.toMatchObject({duplicate:true});expect(model.create).toHaveBeenCalledOnce();
  model.prior.mockResolvedValue(null);await service.send(staff,11,{message:'Hi',client_key:'demo-message-retry-0001'});
  const hash=model.event.mock.calls.at(-1)[4];model.prior.mockResolvedValue({ticket_id:11,event_type:'message',payload_hash:hash,message_id:21});ticket.state='RESOLVED';
  await expect(service.send(staff,11,{message:'Hi',client_key:'demo-message-retry-0001'})).resolves.toMatchObject({duplicate:true,message_id:21});
  await expect(service.send(staff,12,{message:'Hi',client_key:'demo-message-retry-0001'})).rejects.toMatchObject({status:400});
});
it('acknowledges an accepted claim retry with its original version',async () => {
  await service.action(admin,11,{action:'claim',version:0,client_key:retryKey});
  model.prior.mockResolvedValue({ticket_id:11,event_type:'claim',payload_hash:model.event.mock.calls[0][4]});
  await expect(service.action(admin,11,{action:'claim',version:0,client_key:retryKey})).resolves.toMatchObject({duplicate:true});expect(model.update).toHaveBeenCalledOnce();
});
it.each([{category:'constructor'},{description:''},{subject:'x'.repeat(256)},{client_key:'short'}])('validates creation details',async changes => {
  await expect(service.create(staff,{...creation,...changes})).rejects.toMatchObject({status:400});expect(model.create).not.toHaveBeenCalled();
});
it('keeps committed actions accepted after notifications fail',async () => {
  notification.notifyInAppBulk.mockRejectedValue(new Error('Synthetic unavailable'));
  await expect(service.create(staff,creation)).resolves.toMatchObject({ticket:{id:11}});expect(tx.rollback).not.toHaveBeenCalled();
});
it.each([null,[],42])('rejects malformed payloads before writing',async body => {
  for (const run of [() => service.create(staff,body),() => service.send(staff,11,body),() => service.action(staff,11,body)]) await expect(run()).rejects.toMatchObject({status:400});
  expect(model.create).not.toHaveBeenCalled();expect(model.message).not.toHaveBeenCalled();
});
it('rolls back failed writes and retries transient deadlocks only',async () => {
  model.message.mockRejectedValueOnce(Object.assign(new Error('Deadlock'),{code:'ER_LOCK_DEADLOCK'}));
  await service.create(staff,creation);expect(tx.rollback).toHaveBeenCalledOnce();expect(tx.commit).toHaveBeenCalledOnce();expect(tx.release).toHaveBeenCalledTimes(2);
});

it('retains creator-only archive listing for staff and global authorized monitoring for Admin',async()=>{
 await service.list(staff,{view:'archive',before:'99'});
 expect(model.list).toHaveBeenCalledWith(4,{view:'archive',state:undefined,category:undefined,before:99});
 await service.list(admin,{view:'active'});
 expect(model.list).toHaveBeenLastCalledWith(null,{view:'active',state:undefined,category:undefined,before:null});
 await expect(service.list(staff,{view:'purge'})).rejects.toMatchObject({status:400});
});

it('authorizes per-user read receipts before writing and preserves unread list values',async()=>{
 await service.markRead(staff,11,{through:31});expect(reads.mark).toHaveBeenCalledWith('internal',staff.id,expect.any(Number),31);
 reads.mark.mockClear();model.actor.mockResolvedValueOnce({...staff,id:99});await expect(service.markRead({...staff,id:99},11,{through:31})).rejects.toMatchObject({status:403});expect(reads.mark).not.toHaveBeenCalled();
});
