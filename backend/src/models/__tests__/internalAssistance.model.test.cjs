const model = require('../internalAssistance.model');
it('parameterizes creator/category/state/cursor filters in a separate table',async () => {
  const executor={query:vi.fn().mockResolvedValue([[]])};
  await model.list(4,{state:'QUEUED',category:'other',before:11},executor);
  const [config,values]=executor.query.mock.calls[0];
  expect(config.sql).toContain('internal_assistance_tickets');expect(config.sql).toContain('t.created_by=?');expect(config.sql).not.toContain('support_tickets');expect(values).toEqual([4,'QUEUED','other',11]);
});
it('locks only the ticket before retrieving the joined metadata',async () => {
  const executor={query:vi.fn().mockResolvedValue([[]])};await model.ticket(11,executor,true);
  expect(executor.query.mock.calls[0][0].sql).toBe('SELECT id FROM internal_assistance_tickets WHERE id=? FOR UPDATE');
});
it('returns older history chronologically without retry hashes or student files',async () => {
  const rows=Array.from({length:51},(_,index)=>({id:100-index,message:'Demo'}));
  const executor={query:vi.fn().mockResolvedValue([rows])};
  const result=await model.history(11,101,executor);expect(result.next_cursor).toBe(51);expect(result.messages[0].id).toBe(51);expect(result.messages.at(-1).id).toBe(100);
  expect(executor.query).toHaveBeenCalledOnce();expect(executor.query.mock.calls[0][0].sql).not.toContain('payload_hash');
});
