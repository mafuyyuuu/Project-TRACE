const model=require('../supportTicket.model');
it.each(['ticket','list'])('includes the existing document routing snapshot in %s reads',async method=>{
  const executor={query:vi.fn().mockResolvedValue([[{id:11,routing_college_id:3}]])};
  const result=method==='ticket'?await model.ticket(11,executor):await model.list('1=1',[],null,executor);
  expect(method==='ticket'?result:result.tickets[0]).toMatchObject({routing_college_id:3});
  expect(executor.query.mock.calls[0][0].sql).toContain('d.routing_college_id');
});
