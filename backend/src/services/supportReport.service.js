const reports=require('../models/supportReport.model');
const tickets=require('./supportTicket.service');
const {summarize}=require('../utils/supportMetrics');
const {badRequest,forbidden}=require('../utils/AppError');
function period(query = {},now=new Date()) {
  const end=query.dateTo ? day(query.dateTo).getTime()+86400000 : now.getTime();
  const start=query.dateFrom ? day(query.dateFrom).getTime() : end-30*86400000;
  if(start>=end || end-start>366*86400000)throw badRequest('Choose a reporting period of 1–366 days.');
  return {from:new Date(start),to:new Date(end)};
}
function day(value) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))throw badRequest('Use YYYY-MM-DD for support report dates.');
  const date=new Date(`${value}T00:00:00+08:00`);
  if(!Number.isFinite(date.getTime()) || new Date(date.getTime()+8*3600000).toISOString().slice(0,10)!==value)throw badRequest('Choose a valid support report date.');
  return date;
}
async function aggregate(query = {}) {
  const {from,to}=period(query);
  const [dataset,manual]=await Promise.all([reports.dataset(from,to),require('./manualFaq.service').aggregate(from,to)]);
  const result=summarize(dataset,from,to),faq={...result.faq,topics:{...result.faq.topics}};
  for(const field of ['views','helpful','not_helpful','feedback_denominator'])faq[field]+=manual[field];
  for(const [question,row] of Object.entries(manual.topics))faq.topics[`Manual: ${question}`]=row;
  return {...result,faq,ticket_faq:result.faq,manual_faq:manual,notes:[...result.notes,'FAQ totals include ticket assistance and the User Manual. Manual views count once per account/question/Manila day; ratings use the latest response per account/question in the selected period. Manual ratings never resolve tickets or change escalation denominators.']};
}
async function report(user,query = {}) {
  const actor=await tickets.currentActor(user);
  if(actor?.role !== 'admin')throw forbidden('Only Admin can view support analytics.');
  const result=await aggregate(query);
  const insights=await require('./supportInsight.service').get(user,query,result);
  return {...result,analysis:{source:insights.length && insights.every(row=>row.method==='aggregate_rules') ? 'ai_engine_aggregate_rules' : 'unavailable',insights}};
}
module.exports={period,aggregate,report};
