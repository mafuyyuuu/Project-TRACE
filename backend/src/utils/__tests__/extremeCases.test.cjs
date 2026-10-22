const {extremeCases}=require('../extremeCases');const {STATUS}=require('../documentStatus');
const now=new Date('2026-11-19T00:00:00Z');
const record={id:1,tracking_number:'TRC-SYNTHETIC-TEST',document_type:'Synthetic document',current_status:STATUS.SEC_PROCESSING,created_at_epoch:Date.parse('2026-10-22T00:00:00Z')/1000,stage_entered_epoch:Date.parse('2026-11-18T00:00:00Z')/1000,estimated_ready_date:'2026-11-18'};
it('flags the three requested conditions using recorded data and the Monday–Thursday deadline',()=>{
  const result=extremeCases([record],[{stage:STATUS.SEC_PROCESSING,samples:20,p90_minutes:60}],now);
  expect(result.counts).toEqual({long_desk_wait:1,beyond_15_days:1,past_estimate:1});expect(result.rows[0]).toMatchObject({maximum_date:'2026-11-18',stage_wait_minutes:1440,working_days_elapsed:16});
});
it('does not invent desk flags without enough completed intervals or a recorded stage entry',()=>{
  const result=extremeCases([{...record,stage_entered_epoch:null,created_at_epoch:now.getTime()/1000,estimated_ready_date:'2026-11-19'}],[{stage:STATUS.SEC_PROCESSING,samples:19,p90_minutes:1}],now);
  expect(result.counts).toEqual({long_desk_wait:0,beyond_15_days:0,past_estimate:0});expect(result.unmeasured_desk_waits).toBe(1);
});
it('does not blame preparation for an already-ready unclaimed document or a completed request',()=>{
  const result=extremeCases([{...record,current_status:STATUS.READY_FOR_RELEASE},{...record,id:2,current_status:STATUS.COMPLETED}],[],now);
  expect(result.total).toBe(0);expect(result.counts.beyond_15_days).toBe(0);
});
it('keeps due-today cases on time and treats zero minutes as a real measurement',()=>{
  const result=extremeCases([{...record,created_at_epoch:Date.parse('2026-10-22T00:00:00Z')/1000,stage_entered_epoch:Date.parse('2026-11-18T00:00:00Z')/1000}],[{stage:STATUS.SEC_PROCESSING,samples:20,p90_minutes:0}],new Date('2026-11-18T00:01:00Z'));
  expect(result.counts).toEqual({long_desk_wait:1,beyond_15_days:0,past_estimate:0});
});
