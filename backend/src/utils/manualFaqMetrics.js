function summarizeManualFaq(events){
  const topics={},views=new Set(),votes=new Map();
  for(const event of events){
    const topic=topics[event.question] ||= {views:0,helpful:0,not_helpful:0,resolved:0};
    const owner=`${event.user_id}:${event.question_hash}`;
    if(event.action==='view'){
      const day=new Date(Number(event.created_at_ms)+8*3600000).toISOString().slice(0,10),key=`${owner}:${day}`;
      if(!views.has(key)){views.add(key);topic.views++;}
    }else{
      const previous=votes.get(owner);
      if(!previous || Number(event.created_at_ms)>Number(previous.created_at_ms) || Number(event.created_at_ms)===Number(previous.created_at_ms) && Number(event.id)>Number(previous.id))votes.set(owner,event);
    }
  }
  let helpful=0,notHelpful=0;const suggestions=[];
  for(const event of votes.values()){
    if(event.action==='helpful'){helpful++;topics[event.question].helpful++;}
    else if(event.action==='not_helpful'){
      notHelpful++;topics[event.question].not_helpful++;
      if(event.suggestion)suggestions.push({question:event.question,suggestion:event.suggestion,submitted_at:new Date(Number(event.created_at_ms)).toISOString()});
    }
  }
  return {views:views.size,helpful,not_helpful:notHelpful,feedback_denominator:helpful+notHelpful,topics,
    suggestions:suggestions.sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)).slice(0,100),suggestion_count:suggestions.length};
}
module.exports={summarizeManualFaq};
