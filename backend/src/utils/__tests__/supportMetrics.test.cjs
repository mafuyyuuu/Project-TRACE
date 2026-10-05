const {summarize}=require('../supportMetrics');
const {DEFAULTS}=require('../supportHours');
const at=time=>new Date(`2026-10-05T${time}:00+08:00`);
const event=(type,time,data={},actor_id=null)=>({id:1,ticket_id:1,event_type:type,created_at:at(time),data:{calendar:DEFAULTS,...data},actor_id,actor_name:'Synthetic clerk'});
const ticket={id:1,created_at:at('07:59'),category:'profile',imported:false};
it('measures initial/requeue waits and reopened resolution episodes without counting Awaiting student as staff time',()=>{
  const events=[event('created','07:59'),event('escalated','08:00'),event('claimed','08:10',{},4),event('staff_message','08:12',{},4),event('student_reply','08:15',{service_ms:120000}),event('await_student','08:20'),event('requeued','09:20'),event('claimed','09:30',{},4),event('resolve','10:00'),event('reopen','10:30'),event('claimed','10:40',{},4),event('resolve','11:00')];
  const result=summarize({tickets:[ticket],events,backlog:[{last_transition:'resolve',count:1}]},at('00:00'),at('12:00'));
  expect(result.durations.initial_queue).toMatchObject({samples:1,median_minutes:10});
  expect(result.durations.requeue).toMatchObject({samples:2,p90_minutes:10});
  expect(result.durations.first_response.median_minutes).toBe(12);
  expect(result.durations.resolution_service).toMatchObject({samples:2,median_minutes:30,p90_minutes:60});
  expect(result.durations.resolution_wall.p90_minutes).toBe(121);
  expect(result.durations.awaiting_student.median_minutes).toBe(60);
  expect(result.durations.student_reply.median_minutes).toBe(2);
  expect(result.backlog).toEqual({});
});
it('counts explicit FAQ feedback with denominators rather than resolving from silence',()=>{
  const events=[event('created','08:00'),event('faq_view','08:01',{topic_id:'profile'}),event('faq_helpful','08:02',{topic_id:'profile'}),event('escalated','08:03')];
  const result=summarize({tickets:[ticket],events,backlog:[{last_transition:'escalated',count:1}]},at('00:00'),at('12:00'));
  expect(result.faq).toMatchObject({views:1,helpful:1,resolved:0,feedback_denominator:1});
  expect(result.escalation).toEqual({numerator:1,denominator:1,percent:100});
  expect(result.backlog).toEqual({QUEUED:1});
});
it('counts service time across the closed weekend and excludes imported samples',()=>{
  const created=new Date('2026-10-08T15:59:00+08:00'), claimed=new Date('2026-10-12T08:01:00+08:00');
  const events=[{...event('escalated','08:00'),created_at:created},{...event('claimed','08:10'),created_at:claimed}];
  const data={tickets:[{...ticket,created_at:created}],events,backlog:[]};
  expect(summarize(data,created,new Date(claimed.getTime()+1000)).durations.initial_queue.median_minutes).toBe(2);
  data.tickets[0].imported=true;
  expect(summarize(data,created,new Date(claimed.getTime()+1000)).durations.initial_queue).toMatchObject({samples:0,median_minutes:null});
});
it('uses No data for empty or missing duration samples and historical unknown backlog',()=>{
  const result=summarize({tickets:[],events:[],backlog:[{last_transition:'unknown',count:'2'}]},at('00:00'),at('12:00'));
  expect(result.durations.first_response.median_minutes).toBeNull();expect(result.escalation.percent).toBeNull();expect(result.backlog.UNKNOWN).toBe(2);
});
it('uses recorded category at cutoff and labels unobserved waits as missing',()=>{
 const events=[event('created','08:00'),event('faq_view','08:01',{topic_id:'email'}),event('escalated','08:02')];
 const result=summarize({tickets:[{...ticket,category:'future-category'}],events,backlog:[]},at('00:00'),at('12:00'));
 expect(result.categories).toEqual({email:1});expect(result.durations.initial_queue).toMatchObject({samples:0,missing:1});expect(result.durations.first_response.missing).toBe(1);
});
it('counts responded reopened episodes separately from distinct ticket counts',()=>{
 const events=[event('created','08:00'),event('escalated','08:01'),event('staff_message','08:05',{},4),event('resolve','08:10'),event('reopen','09:00'),event('staff_message','09:05',{},4),event('resolve','09:10')];
 const result=summarize({tickets:[ticket],events,backlog:[]},at('00:00'),at('12:00'));
 expect(result.workload[0]).toMatchObject({response_tickets:1,response_episodes:2});expect(result.durations.first_response.samples).toBe(2);
});
