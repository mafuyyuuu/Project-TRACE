const reports=require('./supportReport.service');
const model=require('../models/supportReport.model');
const {summarize}=require('../utils/supportMetrics');
const ai=require('./aiEngine.service');
const approved=new Set(require('../config/supportFaq.json').map(topic=>topic.id).concat(['general','linked']));
function payload(current,previous) {
  return {period:current.period,created:current.created,
    categories:Object.fromEntries(Object.entries(current.categories).filter(([key])=>approved.has(key))),
    queue:current.durations.initial_queue,escalation:current.escalation,
    faq:{views:current.faq.views,topics:Object.fromEntries(Object.entries(current.faq.topics).filter(([key])=>approved.has(key)).map(([key,value])=>[key,value.views]))},
    busy_periods:current.busy_periods,
    previous:{period:previous.period,escalation:previous.escalation,queue_samples:previous.durations.initial_queue.samples,queue_median_minutes:previous.durations.initial_queue.median_minutes}};
}
async function get(user) {
  try {
    const actor=await require('./supportTicket.service').currentActor(user);
    if(actor.role!=='admin')return [];
    const {from,to}=reports.period();
    const previousFrom=new Date(from.getTime()-(to-from));
    const [currentData,previousData]=await Promise.all([model.dataset(from,to),model.dataset(previousFrom,from)]);
    const result=await ai.getSupportInsights(payload(summarize(currentData,from,to),summarize(previousData,previousFrom,from)));
    return Array.isArray(result?.insights) && result.insights.length<=8 && result.insights.every(row=>row && ['info','warning'].includes(row.type) && typeof row.title==='string' && row.title.length<=255 && typeof row.message==='string' && row.message.length<=2000 && row.method==='aggregate_rules' && Number.isFinite(row.sample_size) && row.sample_size>=0 && row.period?.timezone==='Asia/Manila') ? result.insights : [{type:'info',title:'Support advisory unavailable',message:'Support aggregates are available in Support analytics. The AI service did not return advice; no trend is inferred.'}];
  } catch(error) {
    console.warn('Support insight aggregates unavailable:',error.code || 'REPORT_UNAVAILABLE');
    return [{type:'info',title:'Support insights unavailable',message:'The support reporting data is unavailable. No support trend is inferred; retry after checking the schema and reporting service.'}];
  }
}
module.exports={payload,get};
