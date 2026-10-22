const {STATUS,STAGE_LABELS,PIPELINE}=require('./documentStatus');
const {calendarDate,addWorkingDays,workingDaysBetween}=require('./releasePolicy');
const ACTIVE=new Set(PIPELINE.filter(stage=>stage!==STATUS.COMPLETED));
function extremeCases(cases,baselines,now=new Date()){
  const today=calendarDate(now),counts={long_desk_wait:0,beyond_15_days:0,past_estimate:0};
  const baseline=new Map(baselines.map(row=>[row.stage,{samples:Number(row.samples),p90_minutes:row.p90_minutes==null ? null : Number(row.p90_minutes)}]));
  const rows=[];let unmeasured=0,activeDocuments=0;
  for(const record of cases){
    if(!ACTIVE.has(record.current_status))continue;
    activeDocuments++;
    const created=record.created_at_epoch==null ? null : new Date(Number(record.created_at_epoch)*1000),entered=record.stage_entered_epoch == null ? null : new Date(Number(record.stage_entered_epoch)*1000);
    const elapsed=entered && Number.isFinite(entered.getTime()) ? Math.max(0,(now-entered)/60000) : null;
    const comparison=baseline.get(record.current_status),flags=[];
    if(elapsed!=null && comparison?.samples>=20 && Number.isFinite(comparison.p90_minutes) && elapsed>comparison.p90_minutes)flags.push('long_desk_wait');
    if(elapsed==null || !(comparison?.samples>=20))unmeasured++;
    const deadline=addWorkingDays(created,15),estimate=calendarDate(record.estimated_ready_date);
    // Ready for Pickup has fulfilled preparation; an unclaimed document does
    // not become a new preparation breach simply because the student waits.
    if(record.current_status!==STATUS.READY_FOR_RELEASE){
      if(deadline && today>deadline)flags.push('beyond_15_days');
      if(estimate && today>estimate)flags.push('past_estimate');
    }
    if(!flags.length)continue;
    flags.forEach(flag=>counts[flag]++);
    rows.push({id:record.id,tracking_number:record.tracking_number,document_type:record.document_type,stage:record.current_status,
      stage_label:STAGE_LABELS[record.current_status],flags,submitted_date:calendarDate(created),working_days_elapsed:workingDaysBetween(created,now),
      maximum_date:deadline,estimated_ready_date:estimate,stage_wait_minutes:elapsed==null ? null : Math.round(elapsed),
      stage_p90_minutes:comparison?.samples>=20 ? comparison.p90_minutes : null,stage_samples:comparison?.samples || 0});
  }
  rows.sort((a,b)=>b.flags.length-a.flags.length || (b.working_days_elapsed || 0)-(a.working_days_elapsed || 0));
  return {status:'ready',as_of:now.toISOString(),timezone:'Asia/Manila',working_days:'Monday–Thursday',counts,total:rows.length,
    active_documents:activeDocuments,unmeasured_desk_waits:unmeasured,rows:rows.slice(0,100),
    notes:['This is the current open-request snapshot; the historical chart period does not filter these cases.',
      'Long desk wait means above the recorded 90th percentile for that stage in the last 365 days, with at least 20 completed intervals. It is an advisory comparison, not an institutional desk SLA.',
      'The 15-working-day and Ready By flags compare Manila calendar dates. Day 1 follows submission; only Monday–Thursday count. Ready for Pickup is excluded from preparation breaches.',
      'Recognized TRC-MOCK records are excluded. Unmarked data origin is unverified. These flags do not establish the cause of delay or staff performance.']};
}
module.exports={extremeCases};
