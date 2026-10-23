const {printedPageSchedule,calculateBreakdown,resolveSchedule}=require('../pricing');
const {REQUEST_CATALOG}=require('../requestCatalog');
it.each([...REQUEST_CATALOG.filter(type=>!type.fee_pending),...['BSN RLE','Nursing Hours','BSN Course Description','BSN Course Syllabus','BSN International Form','BSN Accreditation'].map(name=>({name,base_fee:50,fee_rule:'flat'}))])('increments the base price from printed pages for $name',type=>{
  const schedule=printedPageSchedule(type),fee_page_counts=Object.fromEntries(schedule.fee_items.filter(item=>item.fee_rule==='per_page').map(item=>[item.label,1]));
  const one=calculateBreakdown(schedule,{copies:2,page_count:1,fee_page_counts},true);
  const three=calculateBreakdown(schedule,{copies:2,page_count:3,fee_page_counts},true);
  expect(three.total-one.total).toBe(type.base_fee*4);
  expect(three).toMatchObject({version:2,calculation_policy:'printed_pages_v2',pages_per_copy:3});
});
it('uses the complete college rate while retaining explicitly fixed extras',()=>{
  const schedule=resolveSchedule({name:'Synthetic document',base_fee:10,fee_rule:'flat',rental_fee:5,college_fee_schedules:[{college_id:2,base_fee:25,fee_rule:'flat',rental_fee:2,special_fee:0,fee_items:[]}]},2);
  expect(calculateBreakdown(schedule,{copies:2,page_count:3},true).total).toBe(152);
  expect(()=>calculateBreakdown(schedule,{copies:2},true)).toThrow(/Pages per copy/);
});
it('does not mutate an old saved schedule or finalized breakdown',()=>{
  const old={document_type:'Synthetic document',fee_rule:'flat',base_fee:50};
  const final=calculateBreakdown(old,{copies:1},true);
  expect(calculateBreakdown(printedPageSchedule(old),{copies:1,page_count:3},true).total).toBe(150);
  expect(old.fee_rule).toBe('flat');expect(final.total).toBe(50);
});
