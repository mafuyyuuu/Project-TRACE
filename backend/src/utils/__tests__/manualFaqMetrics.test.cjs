const {summarizeManualFaq}=require('../manualFaqMetrics');
const row=(id,action,extra={})=>({id,user_id:7,question_hash:'topic',question:'Synthetic question?',action,created_at_ms:Date.parse('2026-10-21T16:01:00Z'),...extra});
it('deduplicates daily views at Manila midnight and latest per-account votes',()=>{
  const result=summarizeManualFaq([row(1,'view',{created_at_ms:Date.parse('2026-10-21T15:59:00Z')}),row(2,'view'),row(3,'view'),row(4,'not_helpful',{suggestion:'Old response'}),row(5,'helpful'),row(6,'not_helpful',{user_id:8,suggestion:'Please include an example.'})]);
  expect(result).toMatchObject({views:2,helpful:1,not_helpful:1,suggestion_count:1,feedback_denominator:2});expect(result.topics['Synthetic question?'].resolved).toBe(0);
  expect(result.suggestions[0].suggestion).toBe('Please include an example.');expect(JSON.stringify(result)).not.toContain('user_id');
});
it('does not invent reviews for an empty period',()=>expect(summarizeManualFaq([])).toMatchObject({views:0,topics:{},suggestions:[]}));
