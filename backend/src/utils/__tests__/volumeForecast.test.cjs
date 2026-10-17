const {historyWindow,fallback,validModel}=require('../volumeForecast');
const now=new Date('2026-10-17T16:30:00Z');
it('uses Manila complete days, fills observed idle days and excludes today/future',()=>{
  const data=historyWindow([{date:'2026-10-01',volume:7},{date:'2026-10-18',volume:900},{date:'2026-10-20',volume:900}],now);
  expect(data.today).toBe('2026-10-18');
  expect(data.history).toHaveLength(17);
  expect(data.history.at(-1)).toEqual({date:'2026-10-17',volume:0});
  expect(data.history.reduce((sum,row)=>sum+row.volume,0)).toBe(7);
});
it('never invents data for empty or short history',()=>{
  expect(fallback(historyWindow([],now))).toMatchObject({forecast:[],source:'insufficient_data'});
  expect(fallback(historyWindow([{date:'2026-10-16',volume:2}],now)).forecast).toEqual([]);
});
it('produces deterministic weekday means including honest zero estimates',()=>{
  const data=historyWindow([{date:'2026-10-01',volume:6}],now),one=fallback(data),two=fallback(data);
  expect(one).toEqual(two);
  expect(one.forecast.map(row=>row.date)).toEqual(['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
  expect(one.forecast.find(row=>row.day==='Thu').predicted_volume).toBe(2);
  expect(one.forecast.find(row=>row.day==='Mon').predicted_volume).toBe(0);
});
it('rejects invalid model dates, volumes and sources before displaying predictions',()=>{
  const data=historyWindow([{date:'2026-10-01',volume:6}],now),good={...fallback(data),source:'prophet'};
  expect(validModel(good,data)).toBe(true);
  for(const value of [{...good,source:'fallback'},{...good,forecast:[]},{...good,forecast:good.forecast.map(row=>({...row,predicted_volume:-1}))},{...good,forecast:good.forecast.map(row=>({...row,date:'2026-01-01'}))}])expect(validModel(value,data)).toBe(false);
});
it('rejects corrupt saved request counts',()=>expect(()=>historyWindow([{date:'2026-10-01',volume:-1}],now)).toThrow());
