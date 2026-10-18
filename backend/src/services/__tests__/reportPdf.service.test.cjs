const reports=require('../reports.service');
const support=require('../supportReport.service');
const actors=require('../supportTicket.service');
const renderer=require('../../utils/reportPdf');
const ADMIN={id:7,role:'admin'};
let service,doc;
const records=()=>({total:2,filters:{status:'COMPLETED',dateFrom:'2026-10-01'},summary:{total:2,completed:2,rejected:0,paid:1,revenue:0},breakdown:{by_status:[{label:'COMPLETED',count:2}],by_document_type:[{label:'Diploma',count:2}]},documents:[{id:1,student_name:'José Peñaflor',amount:null,created_at_epoch:1790812800,created_at:'INVALID'},{id:2,amount:0}]});
const efficiency=()=>({end_to_end:{completed_count:0,avg_minutes:0,min_minutes:0,max_minutes:0},range:{days:30},turnaround_by_desk:[],throughput:[],workload_by_clerk:[{full_name:'Finance Clerk',desk_assignment:'Finance',documents_handled:30,actions_taken:40},{full_name:'Secretary Clerk',desk_assignment:'Secretary',documents_handled:70,actions_taken:80}],analysis:{source:'unavailable',insights:[]}});
beforeEach(()=>{
  doc=Object.fromEntries(['text','heading','table','bars','series','advice'].map(key=>[key,vi.fn()]));doc.save=vi.fn().mockResolvedValue(Buffer.from('%PDF-test'));
  vi.spyOn(renderer,'createReport').mockResolvedValue(doc);
  vi.spyOn(actors,'currentActor').mockResolvedValue(ADMIN);
  vi.spyOn(reports,'getDocumentReport').mockResolvedValue(records());
  vi.spyOn(reports,'getEfficiencyAnalytics').mockResolvedValue(efficiency());
  vi.spyOn(support,'report').mockResolvedValue({period:{from:'2026-10-01T00:00:00+08:00',to_exclusive:'2026-10-03T00:00:00+08:00'},created:0,imported:0,escalation:{percent:null,numerator:0,denominator:0},backlog:{UNKNOWN:null},categories:{},durations:{initial_queue:{median_minutes:0,p90_minutes:0,samples:1,missing:0},first_response:{median_minutes:null,p90_minutes:null,samples:0,missing:1}},faq:{views:0,helpful:0,not_helpful:0,feedback_denominator:0,resolved:0,topics:{}},workload:[],notes:['Imported history excluded.'],analysis:{source:'unavailable',insights:[]}});
  delete require.cache[require.resolve('../reportPdf.service')];service=require('../reportPdf.service');
});
it.each([undefined,{role:'student'},{role:'clerk',desk_assignment:'Window 1'}])('rejects non-Admin before reading any report',async user=>{
 await expect(service.generate(user,'records')).rejects.toMatchObject({status:403});expect(actors.currentActor).not.toHaveBeenCalled();expect(reports.getDocumentReport).not.toHaveBeenCalled();expect(renderer.createReport).not.toHaveBeenCalled();
});
it('rechecks current role and rejects stale Admin access',async()=>{actors.currentActor.mockResolvedValue({id:7,role:'clerk'});await expect(service.generate(ADMIN,'records')).rejects.toMatchObject({status:403});expect(reports.getDocumentReport).not.toHaveBeenCalled();});
it('rejects an unknown report before reading data',async()=>{await expect(service.generate(ADMIN,'unknown')).rejects.toMatchObject({status:400});expect(actors.currentActor).not.toHaveBeenCalled();});
it('exports the complete applied records scope independently of screen pagination with a controlled filename',async()=>{
 const query={status:'COMPLETED',dateFrom:'2026-10-01',studentSearch:'José',page:9,limit:1};const result=await service.generate(ADMIN,'records',query);
 expect(reports.getDocumentReport).toHaveBeenCalledExactlyOnceWith(ADMIN,{...query,page:1,limit:1000});expect(result.filename).toMatch(/^trace-records-report-\d{4}-\d{2}-\d{2}\.pdf$/);expect(Buffer.isBuffer(result.bytes)).toBe(true);
 const table=doc.table.mock.calls.find(([headers])=>headers[0]==='Requested / Updated');expect(table[1]).toHaveLength(2);expect(table[1][0][2]).toContain('José Peñaflor');expect(table[1][0][0]).not.toContain('INVALID');expect(table[1][0][0]).not.toContain('Requested\nNot recorded');expect(table[1].map(row=>row.at(-1))).toEqual(['Not priced','PHP 0.00']);
});
it('refuses oversized or inconsistent report datasets rather than silently truncating',async()=>{
 reports.getDocumentReport.mockResolvedValue({...records(),total:1001});await expect(service.generate(ADMIN,'records')).rejects.toMatchObject({status:400});expect(renderer.createReport).not.toHaveBeenCalled();
 reports.getEfficiencyAnalytics.mockResolvedValue({...efficiency(),throughput:Array(1001).fill({})});await expect(service.generate(ADMIN,'efficiency')).rejects.toMatchObject({status:400});
});
it('includes all matching staff after filtering while keeping the all-staff share denominator',async()=>{
 await service.generate(ADMIN,'efficiency',{dateFrom:'2026-10-01',staffSearch:'Finance',staffDesk:'Finance',page:2,limit:1});
 const table=doc.table.mock.calls.find(([headers])=>headers[0]==='Staff');expect(table[1]).toEqual([['Finance Clerk','Finance','30','40','30%']]);
 const completion=doc.table.mock.calls.find(([headers])=>headers[0]==='Completed samples');expect(completion[1]).toEqual([['0','No data','No data','No data']]);expect(doc.advice).toHaveBeenCalledWith({source:'unavailable',insights:[]});
});
it('preserves explicit zeros, missing durations, denominators and unavailable support analysis',async()=>{
 const query={dateFrom:'2026-10-01',dateTo:'2026-10-02'};await service.generate(ADMIN,'support',query);expect(support.report).toHaveBeenCalledWith(ADMIN,query);
 const durations=doc.table.mock.calls.find(([headers])=>headers[0]==='Metric'&&headers[1]==='Median');expect(durations[1]).toEqual([['initial queue','0','0','1','0'],['first response','No data','No data','0','1']]);
 const summary=doc.table.mock.calls.find(([headers])=>headers[0]==='Metric'&&headers[1]==='Value');expect(summary[1].find(row=>row[0]==='Unresolved backlog')[1]).toBe('No data');expect(summary[1].find(row=>row[0]==='Escalations')[1]).toBe('No data');
 expect(renderer.createReport.mock.calls[0][0].period).toContain('2026-10-03 00:00:00 (end exclusive');
});
it('rejects malformed staff workload filters before report reads',async()=>{await expect(service.generate(ADMIN,'efficiency',{staffSearch:['all']})).rejects.toMatchObject({status:400});expect(reports.getEfficiencyAnalytics).not.toHaveBeenCalled();});

it('rejects a report whose matching count changed rather than exporting an incomplete table',async()=>{reports.getDocumentReport.mockResolvedValue({...records(),total:3});await expect(service.generate(ADMIN,'records')).rejects.toMatchObject({status:400,message:expect.stringContaining('changed')});expect(renderer.createReport).not.toHaveBeenCalled();});
