const { DEFAULTS,serviceMilliseconds } = require('./supportHours');
const parse=value=>typeof value==='string' ? JSON.parse(value) : value || {};
const date=value=>new Date(value);
function distribution(values, missing=0) {
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  const quantile=p=>sorted.length ? sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]/60000 : null;
  return {samples:sorted.length,missing,median_minutes:quantile(0.5),p90_minutes:quantile(0.9)};
}
function summarize({tickets,events,backlog},from,to) {
  const inside=time=>date(time)>=from && date(time)<to;
  const timelines=new Map();for(const event of events){if(!timelines.has(event.ticket_id))timelines.set(event.ticket_id,[]);timelines.get(event.ticket_id).push(event);}
  const categories={},faqTopics={},staff={},busyPeriods={};
  const samples={initial_queue:[],requeue:[],first_response:[],resolution_service:[],resolution_wall:[],awaiting_student:[],student_reply:[]};
  const missing={initial_queue:0,requeue:0,first_response:0,resolution_service:0,resolution_wall:0,awaiting_student:0,student_reply:0};
  let created=0,imported=0,faqEligible=0,escalated=0,faqViews=0,helpful=0,notHelpful=0,faqResolved=0;
  for(const ticket of tickets) {
    const timeline=timelines.get(ticket.id) || [];
    const cohort=inside(ticket.created_at);
    // Category is evaluated at the reporting cutoff, not today's mutable value.
    const faqView=[...timeline].reverse().find(event=>event.event_type==='faq_view');
    const category=ticket.category==='linked' ? 'linked' : faqView ? parse(faqView.data).topic_id : 'general';
    if(cohort) {if(ticket.imported)imported++;else {created++;categories[category]=(categories[category]||0)+1;}}
    let queued=null, queueNumber=0, firstEscalation=null, responseRecorded=false,episodeNumber=0;
    let episodeStart=ticket.imported ? null : date(ticket.created_at), episodeCalendar=DEFAULTS, paused=null,pausedService=0;
    const eligible=timeline.some(event=>event.event_type==='faq_view' || (event.event_type==='created' && !parse(event.data).via));
    if(cohort && !ticket.imported && eligible) faqEligible++;
    if(cohort && !ticket.imported && eligible && timeline.some(event=>event.event_type==='escalated')) escalated++;
    for(const event of timeline) {
      const data=parse(event.data),time=date(event.created_at),calendar=data.calendar || DEFAULTS, measured=inside(time),type=event.event_type;
      if(type==='created')episodeCalendar=calendar;
      if(measured && ['escalated','requeued','reopen'].includes(type)) {
        const manila=new Date(time.getTime()+8*3600000),key=`${manila.getUTCDay()}:${manila.getUTCHours()}`;
        busyPeriods[key]=(busyPeriods[key]||0)+1;
      }
      if(measured && type.startsWith('faq_')) {
        const topic=faqTopics[data.topic_id] ||= {views:0,helpful:0,not_helpful:0,resolved:0};
        if(type==='faq_view'){faqViews++;topic.views++;}
        if(type==='faq_helpful'){helpful++;topic.helpful++;}
        if(type==='faq_not_helpful'){notHelpful++;topic.not_helpful++;}
        if(type==='faq_resolved'){faqResolved++;topic.resolved++;}
      }
      if(['escalated','requeued','reopen','imported'].includes(type) || type==='created' && data.via==='attachment_request') {
        queued={time,calendar,number:queueNumber++};
        if(!firstEscalation && type==='escalated') firstEscalation={time,calendar};
        if(type==='reopen') {episodeStart=time;episodeCalendar=calendar;pausedService=0;paused=null;episodeNumber++;firstEscalation={time,calendar};responseRecorded=false;}
        if(paused) {const duration=serviceMilliseconds(paused,time,episodeCalendar);pausedService+=duration;if(measured && !ticket.imported)samples.awaiting_student.push(duration);paused=null;}
      }
      if(type==='claimed') {
        if(measured) {
          const member=staff[event.actor_id] ||= {id:event.actor_id,name:event.actor_name || 'Recorded clerk',assignments:0,response_tickets:new Set(),response_episodes:new Set()};member.assignments++;
          if(!ticket.imported) {const name=queued?.number ? 'requeue' : 'initial_queue';if(queued)samples[name].push(serviceMilliseconds(queued.time,time,queued.calendar));else missing[name]++;}
        }
        queued=null;
      }
      if(type==='staff_message') {
        if(measured) {const member=staff[event.actor_id] ||= {id:event.actor_id,name:event.actor_name || 'Recorded clerk',assignments:0,response_tickets:new Set(),response_episodes:new Set()};member.response_tickets.add(ticket.id);member.response_episodes.add(`${ticket.id}:${episodeNumber}`);}
        if(!responseRecorded) {
          if(measured && !ticket.imported) {if(firstEscalation)samples.first_response.push(serviceMilliseconds(firstEscalation.time,time,firstEscalation.calendar));else missing.first_response++;}
          responseRecorded=true;
        }
      }
      if(type==='student_reply' && measured && !ticket.imported) {if(Number.isFinite(Number(data.service_ms))) samples.student_reply.push(Number(data.service_ms));else missing.student_reply++;}
      if(['await_student','response_timeout'].includes(type)) {paused=time;if(type==='response_timeout' && measured && !ticket.imported && Number.isFinite(Number(data.service_ms)))samples.student_reply.push(Number(data.service_ms));}
      if(type==='resolve') {
        if(paused){const duration=serviceMilliseconds(paused,time,episodeCalendar);pausedService+=duration;if(measured && !ticket.imported)samples.awaiting_student.push(duration);paused=null;}
        if(measured && !ticket.imported) {
          if(episodeStart) {samples.resolution_wall.push(time-episodeStart);samples.resolution_service.push(Math.max(0,serviceMilliseconds(episodeStart,time,episodeCalendar)-pausedService));}
          else {missing.resolution_wall++;missing.resolution_service++;}
        }
        episodeStart=null;
      }
    }
    if(!ticket.imported) {
      if(queued) missing[queued.number ? 'requeue' : 'initial_queue']++;
      if(firstEscalation && !responseRecorded) missing.first_response++;
      if(episodeStart){missing.resolution_wall++;missing.resolution_service++;}
      if(paused) missing.awaiting_student++;
    }
  }
  const states={created:'FAQ_ASSISTANCE',imported:'QUEUED',escalated:'QUEUED',claimed:'IN_PROGRESS',resolve:'RESOLVED',reopen:'QUEUED',await_student:'AWAITING_STUDENT',response_timeout:'AWAITING_STUDENT',requeued:'QUEUED',unknown:'UNKNOWN'};
  const pending={};for(const row of backlog){const state=row.last_transition==='created' && row.via==='attachment_request' ? 'QUEUED' : states[row.last_transition] || 'UNKNOWN';if(state!=='RESOLVED')pending[state]=(pending[state]||0)+Number(row.count);}
  return {period:{from:from.toISOString(),to_exclusive:to.toISOString(),timezone:'Asia/Manila'},created,imported,categories,backlog:pending,
    durations:Object.fromEntries(Object.entries(samples).map(([name,values])=>[name,distribution(values,missing[name])])),
    faq:{views:faqViews,helpful,not_helpful:notHelpful,resolved:faqResolved,feedback_denominator:helpful+notHelpful,topics:faqTopics},
    escalation:{numerator:escalated,denominator:faqEligible,percent:faqEligible ? 100*escalated/faqEligible : null},
    workload:Object.values(staff).map(member=>({...member,response_tickets:member.response_tickets.size,response_episodes:member.response_episodes.size})),busy_periods:busyPeriods,
    notes:['Duration samples exclude imported histories. Missing measurements are not zeros.','Resolution service time excludes Awaiting student intervals; wall time includes them.','FAQ helpful feedback and explicit resolution are separate. Escalation uses the selected creation cohort.']};
}
module.exports={summarize,distribution};
