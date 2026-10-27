const reads=require('../conversationRead.model');
it.each([undefined,0,-1,{},'1 OR 1=1',Number.MAX_SAFE_INTEGER+1])('rejects an invalid read position without a query: %s',async value=>{
 const db={query:vi.fn()};await expect(reads.mark('support',3,11,value,db)).rejects.toMatchObject({status:400});expect(db.query).not.toHaveBeenCalled();
});
it('refuses a cursor belonging to another thread before writing a read position',async()=>{
 const db={query:vi.fn().mockResolvedValue([[]])};await expect(reads.mark('staff',4,21,31,db)).rejects.toMatchObject({status:400});expect(db.query).toHaveBeenCalledTimes(1);
});
it('returns only unread counts for the authorized list and excludes the viewer’s own messages',async()=>{
 const db={query:vi.fn().mockResolvedValue([[{id:11,unread_count:'2'}]])};
 expect(await reads.withUnread('support',3,[{id:11},{id:12}],db)).toEqual([{id:11,unread_count:2},{id:12,unread_count:0}]);
 const [sql,values]=db.query.mock.calls[0];expect(sql).toContain('m.sender_id<>?');expect(values).toEqual([3,'support',11,12,3]);
});
