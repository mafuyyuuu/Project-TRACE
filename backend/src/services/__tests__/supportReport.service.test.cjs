const service=require('../supportReport.service');
const tickets=require('../supportTicket.service');
const model=require('../../models/supportReport.model');
beforeEach(()=>{vi.spyOn(tickets,'currentActor').mockImplementation(async user=>user);vi.spyOn(model,'dataset').mockResolvedValue({tickets:[],events:[],backlog:[]});});
it.each([{id:1,role:'admin'},{id:2,role:'clerk',desk_assignment:'Window 1'}])('allows only recorded support managers to read aggregate reports',async user=>{
  await expect(service.report(user,{dateFrom:'2026-10-05',dateTo:'2026-10-05'})).resolves.toMatchObject({created:0});
  expect(model.dataset).toHaveBeenCalledWith(new Date('2026-10-04T16:00:00Z'),new Date('2026-10-05T16:00:00Z'));
});
it.each([{role:'student'},{role:'clerk',desk_assignment:'Finance'},{role:'clerk',desk_assignment:'Secretary'}])('denies other roles before reading report data',async user=>{
  await expect(service.report(user)).rejects.toMatchObject({status:403});expect(model.dataset).not.toHaveBeenCalled();
});
it.each([{dateFrom:'2026-02-30'},{dateTo:'bad'},{dateFrom:'2026-10-06',dateTo:'2026-10-05'},{dateFrom:'2024-01-01',dateTo:'2026-01-01'}])('rejects invalid or unbounded reporting periods',query=>expect(()=>service.period(query)).toThrow());
