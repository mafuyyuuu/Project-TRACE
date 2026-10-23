const service=require('../manualFaq.service'),model=require('../../models/manualFaq.model'),tickets=require('../supportTicket.service');
const question=require('../../config/manualFaq.json')[0];
const body={question,action:'not_helpful',suggestion:'Explain the next step.',client_key:'synthetic-feedback-key-001'};
beforeEach(()=>{vi.spyOn(tickets,'currentActor').mockImplementation(async user=>user);vi.spyOn(model,'append').mockImplementation(async row=>({payload_hash:row.payloadHash}));vi.spyOn(model,'feedback').mockResolvedValue([]);vi.spyOn(model,'events').mockResolvedValue([]);});
it.each([{id:7,role:'student'},{id:8,role:'admin'},...['Window 1','Receiving Desk','Secretary','Finance'].map((desk_assignment,id)=>({id:id+20,role:'clerk',desk_assignment}))])('uses the authorized actor for each account type',async actor=>{
  await expect(service.record(actor,{...body,user_id:999})).resolves.toEqual({saved:true});expect(model.append).toHaveBeenCalledWith(expect.objectContaining({userId:actor.id,question,suggestion:body.suggestion}));
});
it.each([{question:'Injected question?'},{action:'resolved'},{client_key:'bad'},{suggestion:42},{suggestion:'x'.repeat(2001)},{action:'helpful'}])('rejects invalid content before writing',async invalid=>{
  await expect(service.record({id:7,role:'student'},{...body,...invalid})).rejects.toMatchObject({status:400});expect(model.append).not.toHaveBeenCalled();
});
it('denies changed account permissions before reading or writing',async()=>{
  tickets.currentActor.mockRejectedValue(Object.assign(new Error('Inactive'),{status:403}));
  await expect(service.feedback({id:7,role:'student'})).rejects.toMatchObject({status:403});await expect(service.record({id:7,role:'student'},body)).rejects.toMatchObject({status:403});expect(model.append).not.toHaveBeenCalled();expect(model.feedback).not.toHaveBeenCalled();
});
it('reads only the signed-in account and detects mismatched retry payloads',async()=>{
  await service.feedback({id:7,role:'student'});expect(model.feedback).toHaveBeenCalledWith(7);
  model.append.mockResolvedValue({payload_hash:'different'});await expect(service.record({id:7,role:'student'},body)).rejects.toMatchObject({status:400});
});
it('accepts an optional blank suggestion and never fabricates a truncated report',async()=>{
  await expect(service.record({id:7,role:'student'},{...body,suggestion:''})).resolves.toEqual({saved:true});
  model.events.mockResolvedValue(Array(50001).fill({}));await expect(service.aggregate(new Date(),new Date())).rejects.toMatchObject({status:400});
});
it('keeps server-approved questions synchronized with the role-aware manual',()=>{
  const fs=require('fs'),path=require('path'),source=fs.readFileSync(path.resolve(__dirname,'../../../../frontend/src/pages/HelpPage.jsx'),'utf8');
  expect(new Set(require('../../config/manualFaq.json'))).toEqual(new Set([...source.matchAll(/\['([^'\n]+\?)',/g)].map(row=>row[1])));
});
