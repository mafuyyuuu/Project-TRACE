const model=require('../staffConversation.model');
it('locks account rows in deterministic order before joining profile metadata',async()=>{
  const executor={query:vi.fn().mockResolvedValue([[]])};await model.actors([7,4,7],executor,true);
  expect(executor.query.mock.calls.slice(0,2).map(([config,values])=>[config.sql,values])).toEqual([['SELECT id FROM users WHERE id=? FOR UPDATE',[4]],['SELECT id FROM users WHERE id=? FOR UPDATE',[7]]]);
  expect(executor.query.mock.calls[2][0].sql).not.toContain('password');
});
it('parameterizes directory search, active roles, college restrictions and cursor',async()=>{
  const executor={query:vi.fn().mockResolvedValue([[]])};await model.recipients({id:12,desk_assignment:'Secretary',resolved_college_id:2},'a%_b',50,executor);
  const [config,values]=executor.query.mock.calls[0];expect(config.sql).toContain("u.role='clerk'");expect(config.sql).toContain('u.id<>?');expect(config.sql).toContain('uc.id=?');expect(config.sql).toContain('LIMIT 21');expect(values).toEqual([12,2,'a%_b','a%_b',50]);
});
it('scopes staff lists to membership and college while Admin gets monitoring history',async()=>{
  const executor={query:vi.fn().mockResolvedValue([[]])};await model.list({id:12,role:'clerk',desk_assignment:'Secretary',resolved_college_id:2},40,executor);
  expect(executor.query.mock.calls[0][1]).toEqual([12,12,2,40]);expect(executor.query.mock.calls[0][0].sql).toContain('t.scope_college_id=?');
  await model.list({id:9,role:'admin'},null,executor);expect(executor.query.mock.calls[1][1]).toEqual([]);
});
it('returns chronological history with a retained older cursor, without event keys',async()=>{
  const rows=Array.from({length:51},(_,index)=>({id:100-index,message:'Demo'}));const executor={query:vi.fn().mockResolvedValue([rows])};
  const result=await model.history(21,101,executor);expect(result.next_cursor).toBe(51);expect(result.messages[0].id).toBe(51);expect(result.messages.at(-1).id).toBe(100);expect(executor.query.mock.calls[0][0].sql).not.toContain('payload_hash');
});
