const filters=require('../reportFilters.service');
const refs=require('../../models/referenceData.model');
const users=require('../../models/user.model');
const report=require('../reports.service');
const reports=require('../../models/report.model');
const finance=require('../finance.service');
const payments=require('../../models/finance.model');
const {pool}=require('../../config/db');
const {documentCsv,DOCUMENT_COLUMNS}=require('../../utils/reportCsv');
const admin={id:1,role:'admin'},sec={id:2,role:'clerk',desk_assignment:'Secretary'},cashier={id:3,role:'clerk',desk_assignment:'Finance'};
beforeEach(()=>{
  vi.spyOn(users,'findCourseById').mockResolvedValue([{college_id:4,course:'Synthetic College'}]);
  vi.spyOn(refs,'findCollegeById').mockResolvedValue([{id:4,name:'Synthetic College',is_active:1}]);
  vi.spyOn(refs,'findDocumentTypeByName').mockResolvedValue([{id:1,name:'Diploma',is_active:1}]);
  vi.spyOn(refs,'listColleges').mockResolvedValue([{id:4,name:'Synthetic College',is_active:1},{id:5,name:'Other College',is_active:1}]);
  vi.spyOn(refs,'listDocumentTypes').mockResolvedValue([{id:1,name:'Diploma',is_active:1}]);
});
it('locks college options to the Secretary and rejects a forged filter before record queries',async()=>{
  expect(await filters.options(sec)).toMatchObject({college_locked:true,colleges:[{id:4}]});
  const list=vi.spyOn(reports,'listDocumentsForReport').mockResolvedValue([]);
  await expect(report.getDocumentReport(sec,{collegeId:5})).rejects.toMatchObject({status:403});
  await expect(report.exportDocumentsCsv(sec,{collegeId:5})).rejects.toMatchObject({status:403});
  expect(list).not.toHaveBeenCalled();
});
it.each([{studentName:['x']},{studentId:{a:1}},{studentName:'x'.repeat(256)},{collegeId:'x'},{collegeId:['4']},{status:'bad'},{paymentStatus:'bad'}])('rejects malformed reporting filters %j',async query=>{
  await expect(report.getDocumentReport(admin,query)).rejects.toMatchObject({status:400});
});
it('rejects unknown document types and inactive colleges instead of ignoring the filter',async()=>{
  refs.findDocumentTypeByName.mockResolvedValue([]);
  await expect(filters.identity(admin,{documentType:'Missing'})).rejects.toMatchObject({status:400});
  refs.findCollegeById.mockResolvedValue([{id:4,is_active:0}]);
  await expect(filters.identity(admin,{collegeId:4})).rejects.toMatchObject({status:400});
});
it.each([{dateFrom:'2026-02-29'},{dateTo:'2026-10-40'}])('rejects impossible calendar dates %j',async query=>{
  await expect(report.getDocumentReport(admin,query)).rejects.toMatchObject({status:400});
});
it('shares literal case-insensitive name matching and college scope across queries',async()=>{
  const selection={studentId:'SYN-1',studentName:'Ana%_!',documentType:'Diploma',collegeId:4};
  const clause=reports.buildDocumentFilters(selection);
  expect(clause.where).toContain("LOWER(d.student_name) LIKE LOWER(?) ESCAPE '!'");
  expect(clause.where).toContain('COALESCE(d.routing_college_id');
  expect(clause.params).toEqual(['Diploma','SYN-1','%Ana!%!_!!%',4]);
  const executor={query:vi.fn().mockResolvedValue([[]])};
  await reports.listDocumentsForReport(selection,{limit:25,offset:0},executor);
  await reports.groupDocumentsBy('document_type',selection,executor);
  for(const [sql,params] of executor.query.mock.calls){expect(sql).toContain(clause.where);expect(params.slice(0,4)).toEqual(clause.params);}
});
it('uses inclusive Manila day boundaries regardless of the API host timezone',()=>{
  const clause=reports.buildDocumentFilters({dateFrom:'2026-10-01',dateTo:'2026-10-01'});
  expect(clause.params).toEqual([Date.parse('2026-09-30T16:00:00Z')/1000,Date.parse('2026-10-01T16:00:00Z')/1000]);
});
it('refuses a document export exceeding the limit instead of returning a truncated file',async()=>{
  vi.spyOn(reports,'listDocumentsForReport').mockResolvedValue(Array.from({length:10001},()=>({})));
  await expect(report.exportDocumentsCsv(admin,{})).rejects.toThrow(/Narrow/);
});
it('uses the same document header for Finance and other staff and exports all members of a group',async()=>{
  const rows=[{id:1,student_name:'Synthetic Name',amount:100,request_group_id:'SYN-G'},{id:2,student_name:'Synthetic Name',amount:200,request_group_id:'SYN-G'}];
  vi.spyOn(reports,'listDocumentsForReport').mockResolvedValue(rows);
  const tx={beginTransaction:vi.fn(),commit:vi.fn(),rollback:vi.fn(),release:vi.fn()};vi.spyOn(pool,'getConnection').mockResolvedValue(tx);
  vi.spyOn(payments,'summary').mockResolvedValue({total:1,amount:300});vi.spyOn(payments,'exportDocuments').mockResolvedValue(rows);
  const staffCsv=await report.exportDocumentsCsv(admin),financeCsv=await finance.transactions(cashier,{},true);
  expect(financeCsv.rowCount).toBe(2);expect(staffCsv.rowCount).toBe(2);
  expect(financeCsv.csv.split('\r\n')[0]).toBe(staffCsv.csv.split('\r\n')[0]);
  expect(financeCsv.csv.split('\r\n')[0]).toBe(DOCUMENT_COLUMNS.map(c=>c.label).join(','));
});
it('does not export private fields and gives timestamps an explicit Manila offset',()=>{
  const csv=documentCsv([{student_name:'  =HYPERLINK("bad")',amount:100,created_at_epoch:Date.parse('2026-10-01T00:00:00Z')/1000,password:'private-password',ocr_raw_text:'private-image',chat_body:'private-chat'}]);
  expect(csv).toContain("'  =HYPERLINK");expect(csv).toContain('2026-10-01T08:00:00+08:00');expect(csv).not.toMatch(/private-password|private-image|private-chat/);
});
it('matches complete Finance groups and never filters away their other document rows',async()=>{
  const executor={query:vi.fn().mockResolvedValue([[]])};
  const query={studentName:'Ana',documentType:'Diploma',collegeId:4,from:'2026-10-01',receipt:'pending'};
  await payments.exportDocuments(query,executor);
  const [sql,params]=executor.query.mock.calls[0];
  expect(sql).toContain('SELECT request_group_id FROM');expect(sql).toContain('GROUP BY COALESCE(d.request_group_id, d.tracking_number)');
  expect(sql).toContain('LIMIT 10001');expect(params).toEqual(['Diploma','%Ana%',4,Date.parse('2026-10-01T00:00:00+08:00')/1000]);
});
