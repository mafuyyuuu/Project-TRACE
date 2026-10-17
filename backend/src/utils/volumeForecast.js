/** Calendar-day request counts only; no audit-action counts or synthetic jitter. */
const DAY = 86400000;
const dayKey = date => new Date(date).toISOString().slice(0, 10);
function historyWindow(rows, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year:'numeric',month:'2-digit',day:'2-digit' }).format(now);
  const end = Date.parse(`${today}T00:00:00Z`);
  const counts = new Map(rows.map(row => [row.date instanceof Date ? dayKey(row.date) : String(row.date).slice(0,10), Number(row.volume)]));
  const keys = [...counts.keys()].filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key) && Date.parse(key) < end && Date.parse(key) >= end-90*DAY).sort();
  if (!keys.length) return { history:[], today, timezone:'Asia/Manila' };
  const history = [];
  for (let time=Date.parse(keys[0]);time<end;time+=DAY) {
    const date=dayKey(time),volume=counts.get(date) ?? 0;
    if (!Number.isSafeInteger(volume) || volume<0) throw new TypeError('Invalid recorded request volume.');
    history.push({date,volume});
  }
  return {history,today,timezone:'Asia/Manila'};
}
function futureDays(today) {
  const start=Date.parse(`${today}T00:00:00Z`)+DAY;
  return Array.from({length:7},(_,i)=>{const date=new Date(start+i*DAY);return{date:dayKey(date),day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]};});
}
function fallback(data) {
  if (data.history.length<14) return {forecast:[],source:'insufficient_data',message:'At least 14 complete calendar days of recorded requests are needed for an estimate.'};
  return {forecast:futureDays(data.today).map(day=>{
    const weekday=new Date(day.date).getUTCDay();
    const samples=data.history.filter(row=>new Date(row.date).getUTCDay()===weekday);
    return {...day,predicted_volume:Math.round(samples.reduce((sum,row)=>sum+row.volume,0)/samples.length)};
  }),source:'historical_weekday_average',message:'Historical weekday average; the Prophet service is unavailable or returned an unusable estimate.'};
}
function validModel(result,data) {
  const dates=futureDays(data.today);
  return result?.source==='prophet' && Array.isArray(result.forecast) && result.forecast.length===7 && result.forecast.every((row,index)=>row.date===dates[index].date && row.day===dates[index].day && Number.isSafeInteger(row.predicted_volume) && row.predicted_volume>=0);
}
module.exports={historyWindow,fallback,validModel};
