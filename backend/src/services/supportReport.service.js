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
  const {from,to}=period(query);return summarize(await reports.dataset(from,to),from,to);
}
async function report(user,query = {}) {
  const actor=await tickets.currentActor(user);
  if(!tickets.managed(actor))throw forbidden('Only Admin and Window 1 can view support analytics.');
  return aggregate(query);
}
module.exports={period,aggregate,report};
