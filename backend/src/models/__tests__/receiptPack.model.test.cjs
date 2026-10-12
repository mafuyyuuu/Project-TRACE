const model=require('../receiptPack.model');
it('uses current locking reads for allocation under repeatable read',async()=>{
 const executor={query:vi.fn().mockResolvedValue([[]])};await model.control(executor,true);await model.pack(1,executor,true);await model.current('DEMO',executor,true);await model.retry('retry-demo-key-0001',executor,true);await model.get(1,executor,true);await model.numberConflict('DEMO00001','DEMO',executor);
 for(const [sql] of executor.query.mock.calls)expect(sql).toContain('FOR UPDATE');
 expect(executor.query.mock.calls[5][1]).toEqual(['DEMO00001','DEMO']);
});
it('inserts a saved snapshot and claims exactly one reserved position',async()=>{
 const data={group:'DEMO',document_id:11,pack:{id:1,consumed:49},serial:'DEMO00050',client_key:'retry-demo-key-0001',snapshot:{cashier_id:4,issue_date:'2026-10-11'}};
 const executor={query:vi.fn().mockResolvedValueOnce([{insertId:2}]).mockResolvedValueOnce([{affectedRows:1}]).mockResolvedValueOnce([{affectedRows:1}])};
 const receipt=await model.insertReceipt(data,executor);expect(receipt).toMatchObject({id:2,request_group_id:'DEMO',pack_id:1,serial:'DEMO00050',state:'ISSUED'});expect(executor.query.mock.calls[1][1]).toEqual([2,1,49]);expect(executor.query.mock.calls[1][0]).toContain('receipt_id IS NULL');expect(executor.query.mock.calls[2][0]).toContain('consumed<50');
});
it('never deletes or decrements an issued/voided serial',async()=>{const executor={query:vi.fn().mockResolvedValue([{affectedRows:1}])};await model.voidReceipt(2,'Damaged paper',executor);expect(executor.query.mock.calls.map(([s])=>s).join(' ')).not.toMatch(/DELETE|consumed=/);expect(executor.query.mock.calls[0][0]).toContain('active_group=NULL');});
