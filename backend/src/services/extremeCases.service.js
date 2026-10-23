const reports=require('../models/report.model');
const {extremeCases}=require('../utils/extremeCases');
const {forbidden}=require('../utils/AppError');
async function snapshot(user){
  if(user.role!=='admin')throw forbidden('Only Admin can view extreme cases.');
  const now=new Date();
  try{
    const [cases,baselines]=await Promise.all([reports.activeDelayCases(now),reports.deskWaitBaselines(now)]);
    if(cases.length>5000)return {status:'unavailable',message:'The current case set exceeds 5,000 open documents. No partial extreme-case counts are shown.'};
    return extremeCases(cases,baselines,now);
  }catch(error){console.warn('Extreme-case analytics unavailable:',error.code || 'REPORT_UNAVAILABLE');return {status:'unavailable',message:'Extreme-case measurements are unavailable. Retry after checking the reporting schema and data.'};}
}
module.exports={snapshot};
