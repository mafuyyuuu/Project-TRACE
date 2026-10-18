const validDate=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
/** Keep true dates, recorded zeroes, a gap for the incomplete current day, and all seven estimates. */
export function forecastChartData(history=[],predictions=[],today) {
  const rows=new Map();
  for(const row of history.slice(-14))if(validDate(row.date))rows.set(row.date,{date:row.date,actual:row.volume,predicted:null});
  if(validDate(today) && rows.size)rows.set(today,{date:today,actual:null,predicted:null});
  for(const row of predictions)if(validDate(row.date))rows.set(row.date,{date:row.date,actual:null,predicted:row.predicted_volume});
  return [...rows.values()].sort((left,right)=>left.date.localeCompare(right.date));
}
export function forecastDate(value,long=false) {
  if(!validDate(value))return value || 'Date unavailable';
  return new Date(value+'T00:00:00+08:00').toLocaleDateString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',...(long?{weekday:'short',year:'numeric'}:{})});
}
