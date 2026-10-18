const crypto=require('crypto');
const model=require('../models/document.model');
const ai=require('./aiEngine.service');
const {historyWindow}=require('../utils/volumeForecast');
const {plan,summarize}=require('../utils/forecastEvaluation');
const {badRequest,forbidden,AppError}=require('../utils/AppError');
const cache=new Map();let busy=false;
async function evaluate(user,query={}) {
  if(user?.role!=='admin')throw forbidden('Only Admin can evaluate forecasts.');
  const type=query.documentType;
  if(type!=null && (typeof type!=='string'||!type.trim()||type.length>255))throw badRequest('Choose a valid document type.');
  const raw=await model.forecastFallbackRows(type?.trim() || null),data=historyWindow(raw),folds=plan(data.history);
  const dates=new Set(data.history.map(row=>row.date)),knownSynthetic=raw.filter(row=>dates.has(row.date instanceof Date?row.date.toISOString().slice(0,10):String(row.date).slice(0,10))).reduce((sum,row)=>sum+Number(row.known_synthetic_volume || 0),0);
  const metadata={document_type:type?.trim() || null,history:data.history,history_days:data.history.length,sample_size:data.history.reduce((sum,row)=>sum+row.volume,0),as_of:new Date().toISOString(),timezone:'Asia/Manila',data_origin:{status:knownSynthetic>0?'contains_recognized_synthetic':'unverified',known_synthetic_requests:knownSynthetic,note:'Only the TRC-MOCK prefix identifies known generated records. Other synthetic records may exist. Origin is not certified as real institutional data.'},minimum_history_days:22};
  if(!folds.length)return {...metadata,status:'insufficient_data',message:'At least 22 complete days are required: 14 training days, one skipped current day and seven unseen evaluation days. No accuracy score was calculated.'};
  const payload={...data,cutoffs:folds.map(fold=>fold.cutoff)},key=crypto.createHash('sha256').update(JSON.stringify({type:type || null,payload})).digest('hex'),cached=cache.get(key);
  if(cached && Date.now()-cached.time<300000)return {...cached.result,...metadata,cached:true,evaluated_at:cached.result.evaluated_at};
  if(busy)throw new AppError('Another forecast evaluation is running. Wait for it to finish and retry.',409);
  busy=true;
  try {
    const response=await ai.evaluateForecast(payload),result=summarize(response,data.history,folds);
    if(!result)throw new AppError('Prophet evaluation is unavailable. Check or rebuild the AI service and retry. No accuracy score was calculated.',503);
    const report={...result,model:{name:'Prophet',version:typeof response.model?.version==='string' && response.model.version.length<=50?response.model.version:'unreported',daily_seasonality:false,weekly_seasonality:true,yearly_seasonality:false,seed:42},evaluated_at:new Date().toISOString(),notes:['Each fold fits only earlier dates and skips its simulated incomplete current day.','Prophet and the historical weekday baseline are tested on the same unseen dates. Lower MAE and RMSE mean smaller errors.','WAPE is an error percentage, not classification accuracy; it is undefined when all actual counts are zero.','Folds may use as few as 14 training days. Small samples or few folds provide limited evidence; more history is needed for stable conclusions.','These results describe this recorded dataset only and do not establish real-world accuracy when its provenance is unverified.']};
    if(cache.size>=10)cache.delete(cache.keys().next().value);
    cache.set(key,{time:Date.now(),result:report});return {...report,...metadata,cached:false};
  }finally{busy=false;}
}
module.exports={evaluate};
