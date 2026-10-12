const service=require('../supportInsight.service');
const ai=require('../aiEngine.service');
const reports=require('../../models/supportReport.model');
const tickets=require('../supportTicket.service');
const data={period:{from:'2026-10-01T00:00:00Z',to_exclusive:'2026-10-02T00:00:00Z',timezone:'Asia/Manila'},created:10,categories:{profile:10,private_category:1},durations:{initial_queue:{samples:10,median_minutes:2,p90_minutes:5}},escalation:{numerator:2,denominator:10,percent:20},faq:{views:10,topics:{profile:{views:10},private_topic:{views:1}}},busy_periods:{'1:8':10},messages:['private chat'],workload:[{name:'private name'}]};
it('sends only approved aggregate fields and categories, without transcripts or staff identities',()=>{
  const payload=service.payload(data,data),serialized=JSON.stringify(payload);
  expect(payload.categories).toEqual({profile:10});expect(payload.faq.topics).toEqual({profile:10});
  expect(serialized).not.toMatch(/private|messages|workload/);expect(payload.previous.queue_samples).toBe(10);
});
it('gracefully reports an unavailable AI service without invented findings',async()=>{
  vi.spyOn(tickets,'currentActor').mockResolvedValue({role:'admin'});
  vi.spyOn(reports,'dataset').mockResolvedValue({tickets:[],events:[],backlog:[]});
  vi.spyOn(ai,'getSupportInsights').mockResolvedValue(null);
  await expect(service.get({id:1,role:'admin'})).resolves.toEqual([expect.objectContaining({title:'Support advisory unavailable'})]);
});
it('does not fetch aggregate support insights for another role',async()=>{
  vi.spyOn(tickets,'currentActor').mockResolvedValue({role:'student'});
  vi.spyOn(reports,'dataset').mockResolvedValue({tickets:[],events:[],backlog:[]});
  await expect(service.get({id:1,role:'student'})).resolves.toEqual([]);expect(reports.dataset).not.toHaveBeenCalled();
});
