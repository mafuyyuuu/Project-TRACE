const model=require('../supportTicket.model');
it.each(['ticket','list'])('includes the existing document routing snapshot in %s reads',async method=>{
  const executor={query:vi.fn().mockResolvedValue([[{id:11,routing_college_id:3}]])};
  const result=method==='ticket'?await model.ticket(11,executor):await model.list('1=1',[],null,executor);
  expect(method==='ticket'?result:result.tickets[0]).toMatchObject({routing_college_id:3});
  expect(executor.query.mock.calls[0][0].sql).toContain('d.routing_college_id');
});
it.each(['=','<>'])('applies archive membership before cursor pagination without losing ownership (%s)',async operator=>{
 const rows=Array.from({length:21},(_,i)=>({id:100-i,state:operator==='='?'RESOLVED':'QUEUED'}));
 const executor={query:vi.fn().mockResolvedValue([rows])};
 const result=await model.list(`(t.student_user_id=?) AND t.state${operator}?`,[3,'RESOLVED'],110,executor);
 const [config,values]=executor.query.mock.calls[0];
 expect(config.sql).toContain(`WHERE (t.student_user_id=?) AND t.state${operator}? AND t.id < ?`);
 expect(values).toEqual([3,'RESOLVED',110]);
 expect(result.tickets).toHaveLength(20);expect(result.next_cursor).toBe(81);
});
