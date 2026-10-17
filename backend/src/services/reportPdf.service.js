const reports = require('./reports.service');
const support = require('./supportReport.service');
const { createReport } = require('../utils/reportPdf');
const { manilaTimestamp } = require('../utils/reportCsv');
const { STAGE_LABELS } = require('../utils/documentStatus');
const { forbidden, badRequest } = require('../utils/AppError');
const MAX_ROWS=1000;
const measured=value=>value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value));
const number=value=>measured(value)?Number(value).toLocaleString('en-PH',{maximumFractionDigits:2}):'No data';
const money=value=>measured(value)?`PHP ${Number(value).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'Not priced';
const label=value=>STAGE_LABELS[value] || String(value || 'Not recorded').replaceAll('_',' ');
const countTotal=values=>values.every(measured)?values.reduce((sum,value)=>sum+Number(value),0):null;
const timestamp=(row,key)=>manilaTimestamp(row[`${key}_epoch`]!=null?Number(row[`${key}_epoch`])*1000:row[key]) || 'Not recorded';
function bounded(rows){if(rows.length>MAX_ROWS)throw badRequest('More than 1,000 rows match this PDF. Narrow the report period or filters and try again.');return rows;}
function dateScope(query){return `${query.dateFrom || 'All recorded dates'} through ${query.dateTo || 'latest saved data'}`;}
function validateStaff(query){
  for(const field of ['staffSearch','staffDesk'])if(query[field]!=null && (typeof query[field]!=='string'||query[field].length>255))throw badRequest('Choose valid staff workload filters.');
}
function workload(rows,query){
  const total=countTotal(rows.map(row=>row.documents_handled));
  return rows.map(row=>({...row,share:total>0?Math.round(Number(row.documents_handled)/total*1000)/10:0}))
    .filter(row=>(row.full_name || '').toLowerCase().includes((query.staffSearch || '').trim().toLowerCase()) && (!query.staffDesk || query.staffDesk==='all' || row.desk_assignment===query.staffDesk))
    .sort((a,b)=>b.documents_handled-a.documents_handled);
}
async function generate(user,kind,query={}){
  if(user?.role!=='admin')throw forbidden('Only Admin can export PDF reports.');
  if(!['records','efficiency','support'].includes(kind))throw badRequest('Choose a valid PDF report.');
  const actor=await require('./supportTicket.service').currentActor(user);
  if(actor.role!=='admin')throw forbidden('Only Admin can export PDF reports.');
  const title={records:'Document Records Report',efficiency:'Document Efficiency Report',support:'Support Analytics Report'}[kind];
  let data;
  if(kind==='records'){
    data=await reports.getDocumentReport(actor,{...query,page:1,limit:MAX_ROWS});
    if(data.total>MAX_ROWS)throw badRequest('More than 1,000 records match this PDF. Narrow the filters, or use the existing CSV export.');
    bounded(data.documents);bounded(data.breakdown.by_status);bounded(data.breakdown.by_document_type);
    if(data.documents.length!==Number(data.total))throw badRequest('The matching records changed during export. Retry the report.');
  }else if(kind==='efficiency'){
    validateStaff(query);data=await reports.getEfficiencyAnalytics(actor,query);
    bounded(data.turnaround_by_desk);bounded(data.throughput);bounded(data.workload_by_clerk);
  }else{
    data=await support.report(actor,query);bounded(data.workload);bounded(Object.entries(data.faq.topics));
  }
  const generatedAt=manilaTimestamp(new Date()),stamp=generatedAt.slice(0,10);
  const period=kind==='support'?`Reporting period: ${manilaTimestamp(data.period.from)} to ${manilaTimestamp(data.period.to_exclusive)} (end exclusive; Asia/Manila).`:`Reporting scope: ${dateScope(query)}.`;
  const doc=await createReport({title,generatedAt,period,landscape:kind==='records'});
  doc.text('Generated from current authorized saved data using the applied report filters. This file is independent of screen pagination.',{size:9});
  if(kind==='records'){
    const filters=Object.entries(data.filters || {}).filter(([,value])=>value!==undefined && value!==null && value!=='');
    if(filters.length)doc.text('Applied filters: '+filters.map(([key,value])=>`${key}: ${Array.isArray(value)?value.map(label).join(', '):value}`).join(' | '),{size:9});
    doc.heading('Summary');
    doc.table(['Records','Completed','Rejected','Paid','Paid revenue'],[[number(data.summary.total),number(data.summary.completed),number(data.summary.rejected),number(data.summary.paid),money(data.summary.revenue)]],[1,1,1,1,1.5]);
    doc.bars('Documents by status',data.breakdown.by_status.map(row=>({label:label(row.label),value:row.count})),{note:'Counts describe matching records, not processing speed.'});
    doc.table(['Status','Records'],data.breakdown.by_status.map(row=>[label(row.label),number(row.count)]),[4,1]);
    doc.heading('Document types');doc.table(['Document type','Records'],data.breakdown.by_document_type.map(row=>[row.label,number(row.count)]),[4,1]);
    doc.heading(`Matching document records (${data.documents.length})`);
    doc.text('Dates below show Requested and Updated in Asia/Manila. Not priced is distinct from an explicit zero amount.',{size:9});
    doc.table(['Requested / Updated','Tracking','Student / College','Document','Status','Payment','Amount'],data.documents.map(row=>[
      `Requested\n${timestamp(row,'created_at')}\nUpdated\n${timestamp(row,'updated_at')}`,
      row.tracking_number || String(row.id),`${row.student_name || 'Not recorded'}\n${row.student_id || 'ID not recorded'}\n${row.course || 'College not recorded'}`,row.document_sequence_number || row.document_type || 'Not recorded',label(row.current_status),row.payment_status || 'Not recorded',money(row.amount),
    ]),[82,106,130,135,111,65,75]);
  }else if(kind==='efficiency'){
    const end=data.end_to_end,staff=workload(data.workload_by_clerk,query);
    doc.heading('Completion summary');
    doc.table(['Completed samples','Average minutes','Fastest minutes','Slowest minutes'],[[number(end.completed_count),end.completed_count?number(end.avg_minutes):'No data',end.completed_count?number(end.min_minutes):'No data',end.completed_count?number(end.max_minutes):'No data']],[1,1,1,1]);
    doc.text('Completion figures use completed documents with recorded first/last actions; the date filter selects request creation dates. Desk wait/workload filters select recorded action dates. Volumes are not a staff performance ranking.',{size:9});
    doc.bars('Average wait by stage',data.turnaround_by_desk.map(row=>({label:row.label,value:row.avg_minutes})),{unit:'minutes'});
    doc.table(['Stage','Transitions','Average minutes','Maximum minutes'],data.turnaround_by_desk.map(row=>[row.label,number(row.transitions),number(row.avg_minutes),number(row.max_minutes)]),[2.4,1,1.2,1.2]);
    doc.text(query.dateFrom||query.dateTo?`Release chart period: ${dateScope(query)}.`:`Release chart period: the latest ${data.range.days} days. This is a separate window from all-history completion/desk figures.`,{size:9});
    doc.series('Recorded documents released',data.throughput.map(row=>({label:row.date,value:row.completed})));
    doc.table(['Release date','Completed documents'],data.throughput.map(row=>[row.date,number(row.completed)]),[2,1]);
    doc.text(`Staff workload filters: name ${query.staffSearch?.trim() || 'all'}; desk ${query.staffDesk || 'all'}. Shares use all staff in the report period before these workload-only filters.`,{size:9});
    doc.bars('Staff workload',staff.map(row=>({label:row.full_name,value:row.documents_handled})),{max:10});
    doc.table(['Staff','Desk','Documents handled','Actions','Share of total'],staff.map(row=>[row.full_name,row.desk_assignment || 'Not recorded',number(row.documents_handled),number(row.actions_taken),number(row.share)+'%']),[2.3,1.4,1.2,.8,1]);
    doc.advice(data.analysis);
  }else{
    doc.heading('Support summary');
    doc.table(['Metric','Value','Measurement'],[
      ['New tickets',number(data.created),`${number(data.imported)} imported tickets counted separately.`],
      ['Escalations',measured(data.escalation.percent)?number(data.escalation.percent)+'%':'No data',`${number(data.escalation.numerator)} of ${number(data.escalation.denominator)} eligible FAQ-assisted tickets.`],
      ['Unresolved backlog',number(countTotal(Object.values(data.backlog))),'Recorded states at the report cutoff.'],
      ['FAQ views',number(data.faq.views),`${number(data.faq.helpful)} helpful; ${number(data.faq.not_helpful)} not helpful; denominator ${number(data.faq.feedback_denominator)}.`],
      ['Explicit FAQ resolutions',number(data.faq.resolved),'Explicit resolved actions; silence is not resolution.'],
      ['Staff assigned episodes',number(countTotal(data.workload.map(row=>row.assignments))),`${number(countTotal(data.workload.map(row=>row.response_episodes)))} responded episodes. Not a performance ranking.`],
    ],[1.5,1,3]);
    doc.bars('Unresolved backlog at cutoff',Object.entries(data.backlog).map(([key,value])=>({label:label(key),value})),{unit:'tickets'});
    doc.table(['Backlog state','Tickets'],Object.entries(data.backlog).map(([key,value])=>[label(key),number(value)]),[3,1]);
    doc.bars('New ticket categories',Object.entries(data.categories).map(([key,value])=>({label:label(key),value})),{unit:'tickets'});
    doc.table(['Category','New tickets'],Object.entries(data.categories).map(([key,value])=>[label(key),number(value)]),[3,1]);
    doc.heading('Measured durations in minutes');
    doc.text('Median, p90, samples and missing measurements are separate. Missing measurements are never treated as zero.',{size:9});
    doc.table(['Metric','Median','p90','Samples','Missing'],Object.entries(data.durations).map(([key,row])=>[label(key),number(row.median_minutes),number(row.p90_minutes),number(row.samples),number(row.missing)]),[2.3,1,1,.9,.9]);
    doc.heading('Explicit FAQ feedback');
    doc.table(['Topic','Views','Helpful','Not helpful','Resolved'],Object.entries(data.faq.topics).map(([key,row])=>[label(key),number(row.views),number(row.helpful),number(row.not_helpful),number(row.resolved)]),[2.3,1,1,1,1]);
    doc.heading('Clerk workload');
    doc.table(['Clerk','Assigned episodes','Responded episodes'],data.workload.map(row=>[row.name,number(row.assignments),number(row.response_episodes)]),[2,1,1]);
    doc.advice(data.analysis);doc.heading('Measurement notes');for(const note of data.notes)doc.text(note,{size:9});
  }
  return{filename:`trace-${kind}-report-${stamp}.pdf`,bytes:await doc.save()};
}
module.exports={generate,MAX_ROWS};
