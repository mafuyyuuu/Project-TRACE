const policy=require('../releasePolicy');
it.each(['BSN RLE','Nursing Hours','BSN Course Description','BSN Course Syllabus','BSN International Form','BSN Accreditation'])('uses 15 working days for %s',name=>expect(policy.preparationDays(name)).toBe(15));
it.each(['Transcript of Records','Transcript of Record','Transcript of Records for Employment','Honorable Dismissal'])('distinguishes undergraduate and graduate %s',name=>{
  expect(policy.preparationDays(name,{user_type:'student'})).toBe(10);
  expect(policy.preparationDays(name,{user_type:'alumni'})).toBe(5);
  expect(policy.preparationDays(name,{enrollment_status:'graduated'})).toBe(5);
});
it.each(['Copy of Grades','Permanent Record','Permanent Records'])('uses 10 working days for %s',name=>expect(policy.preparationDays(name,{user_type:'alumni'})).toBe(10));
it('counts Monday–Thursday after submission and handles Manila date boundaries',()=>{
  expect(policy.addWorkingDays('2026-10-22',1)).toBe('2026-10-26');
  expect(policy.addWorkingDays('2026-10-22',5)).toBe('2026-11-02');
  expect(policy.addWorkingDays('2026-10-22',10)).toBe('2026-11-10');
  expect(policy.addWorkingDays('2026-10-22',15)).toBe('2026-11-18');
  expect(policy.addWorkingDays('2026-10-25T16:01:00Z',1)).toBe('2026-10-27');
  expect(policy.workingDaysBetween('2026-10-22','2026-11-18')).toBe(15);
});
it('does not invent a policy for unlisted types or invalid dates',()=>{
  expect(policy.preparationDays('Unlisted type')).toBeNull();
  expect(policy.addWorkingDays('2026-02-30',10)).toBeNull();
  expect(policy.addWorkingDays('2026-10-22',16)).toBeNull();
  expect(policy.estimate({document_type:'BSN RLE',created_at:'2026-10-22'}).date).toBe('2026-11-18');
});
it('preserves the preparation-day snapshot when a student later graduates',()=>{
  expect(policy.estimate({document_type:'Transcript of Records',created_at:'2026-10-22',release_working_days:10},{user_type:'alumni'}).date).toBe('2026-11-10');
});

it('counts across the year boundary without inventing holiday exclusions',()=>{
  expect(policy.addWorkingDays('2026-12-31',15)).toBe('2027-01-27');
  expect(policy.addWorkingDays('2026-12-28',5)).toBe('2027-01-05');
  expect(policy.addWorkingDays('2026-12-30',1)).toBe('2026-12-31');
  expect(policy.workingDaysBetween('2026-12-31','2027-01-27')).toBe(15);
});
