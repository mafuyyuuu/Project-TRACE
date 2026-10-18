/** Shared target: omit simulated today, predict tomorrow through day seven. */
function plan(history) {
  const cutoffs=[];
  for(let cutoff=history.length-8;cutoff>=14 && cutoffs.length<5;cutoff-=7)cutoffs.unshift(cutoff);
  return cutoffs.map((cutoff,index)=>({id:index+1,cutoff,training_from:history[0].date,training_through:history[cutoff-1].date,training_days:cutoff,simulated_today:history[cutoff].date,test_from:history[cutoff+1].date,test_through:history[cutoff+7].date}));
}
function metrics(rows,key) {
  const total=rows.reduce((sum,row)=>sum+row.actual,0),absolute=rows.reduce((sum,row)=>sum+Math.abs(row[key]-row.actual),0);
  return {samples:rows.length,mae:absolute/rows.length,rmse:Math.sqrt(rows.reduce((sum,row)=>sum+(row[key]-row.actual)**2,0)/rows.length),wape_percent:total>0?absolute/total*100:null};
}
function summarize(result,history,folds) {
  if(result?.source!=='prophet_backtest' || !Array.isArray(result.predictions) || result.predictions.length!==folds.length*7)return null;
  const rows=[];
  for(const fold of folds){
    const train=history.slice(0,fold.cutoff);
    for(let offset=1;offset<=7;offset++){
      const target=history[fold.cutoff+offset],prediction=result.predictions[rows.length];
      if(prediction?.date!==target.date || prediction.training_through!==fold.training_through || !Number.isSafeInteger(prediction.predicted_volume) || prediction.predicted_volume<0 || prediction.predicted_volume>2147483647)return null;
      const weekday=new Date(target.date).getUTCDay(),samples=train.filter(row=>new Date(row.date).getUTCDay()===weekday),mean=samples.reduce((sum,row)=>sum+row.volume,0)/samples.length;
      // Python/Prophet uses ties-to-even rounding; baseline follows the deployed JS fallback.
      rows.push({fold:fold.id,training_through:fold.training_through,date:target.date,horizon:offset,actual:target.volume,predicted:prediction.predicted_volume,baseline:Math.round(mean),absolute_error:Math.abs(prediction.predicted_volume-target.volume)});
    }
  }
  return {evaluation:{samples:rows.length,actual_requests:rows.reduce((sum,row)=>sum+row.actual,0),nonzero_days:rows.filter(row=>row.actual>0).length,zero_days:rows.filter(row=>row.actual===0).length},status:'ok',source:'prophet_backtest',method:'rolling_origin',folds:folds.map(({cutoff,...fold})=>fold),predictions:rows,metrics:{prophet:metrics(rows,'predicted'),baseline:metrics(rows,'baseline')},per_horizon:Array.from({length:7},(_,i)=>({horizon:i+1,prophet:metrics(rows.filter(row=>row.horizon===i+1),'predicted'),baseline:metrics(rows.filter(row=>row.horizon===i+1),'baseline')}))};
}
module.exports={plan,metrics,summarize};
