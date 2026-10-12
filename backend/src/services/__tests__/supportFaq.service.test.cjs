const crypto=require('crypto');
const faq=require('../supportFaq.service');
const tickets=require('../supportTicket.service');
const model=require('../../models/supportTicket.model');
const topics=require('../../config/supportFaq.json');
const key='synthetic-faq-retry-key';
let actor,ticket,tx;
beforeEach(()=>{
 actor={id:3,role:'student'}; ticket={id:11,student_user_id:3,state:'FAQ_ASSISTANCE',category:'general'}; tx={};
 vi.spyOn(tickets,'transaction').mockImplementation((_user,work)=>work(tx,actor));
 vi.spyOn(tickets,'authorize').mockImplementation(async(_actor,row)=>row);
 vi.spyOn(model,'ticket').mockImplementation(async()=>({...ticket}));
 vi.spyOn(model,'eventExists').mockResolvedValue(null);
 for(const method of ['event','system','update'])vi.spyOn(model,method).mockResolvedValue([]);
});
it('offers approved topics and deterministic matching without inventing answers',()=>{
 expect(faq.list().topics).toEqual(topics); expect(faq.match('when payment')).toEqual(expect.arrayContaining([topics.find(topic=>topic.id==='payment')]));
 expect(faq.match('unrelatedxyz')).toEqual([]);
});
it('records the exact maintained FAQ answer as a system event',async()=>{
 const topic=topics[0]; await faq.feedback(actor,11,{topic_id:topic.id,action:'view',client_key:key});
 expect(model.system).toHaveBeenCalledWith(11,`${topic.question}\n\n${topic.answer}`,{faq_topic_id:topic.id},tx);
 expect(model.event).toHaveBeenCalledWith(11,3,'faq_view',`3:${key}`,expect.objectContaining({topic_id:topic.id}),tx);
});
it('helpful feedback does not infer resolution',async()=>{
 await faq.feedback(actor,11,{topic_id:topics[0].id,action:'helpful',client_key:key}); expect(model.update).not.toHaveBeenCalled();
});
it('deduplicates a successful explicit resolution after the ticket becomes read-only',async()=>{
 const topic=topics[0],body={topic_id:topic.id,action:'resolved',client_key:key};
 await faq.feedback(actor,11,body); expect(model.update).toHaveBeenCalledWith(11,expect.objectContaining({state:'RESOLVED'}),tx);
 ticket.state='RESOLVED'; const hash=crypto.createHash('sha256').update(JSON.stringify({ticketId:11,topic:topic.id,action:'resolved'})).digest('hex');
 model.eventExists.mockResolvedValue({data:{hash}}); model.update.mockClear();
 await expect(faq.feedback(actor,11,body)).resolves.toMatchObject({ticket:{state:'RESOLVED'}}); expect(model.update).not.toHaveBeenCalled();
});
it('rejects a mismatched retry key and invalid ticket identifier',async()=>{
 model.eventExists.mockResolvedValue({data:{hash:'other'}});
 await expect(faq.feedback(actor,11,{topic_id:topics[0].id,action:'view',client_key:key})).rejects.toMatchObject({status:400});
 await expect(faq.feedback(actor,'NaN',{})).rejects.toMatchObject({status:400}); expect(model.system).not.toHaveBeenCalled();
});
it.each(['QUEUED','IN_PROGRESS','RESOLVED'])('does not add FAQ views to %s history',async state=>{
 ticket.state=state; await expect(faq.feedback(actor,11,{topic_id:topics[0].id,action:'view',client_key:key})).rejects.toMatchObject({status:400}); expect(model.event).not.toHaveBeenCalled();
});
